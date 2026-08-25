package helper

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// bvnEncPrefix marks a value as encrypted-at-rest (R8). Values without it are
// treated as legacy plaintext so existing/test rows keep working.
const bvnEncPrefix = "enc:v1:"

// bvnKey reads the AES-256 key from BVN_ENCRYPTION_KEY. It accepts either a
// base64-encoded 32-byte key (recommended: `openssl rand -base64 32`) or a raw
// 32-character string. Absent/invalid key is a hard error — we never fall back
// to storing sensitive PII in the clear.
func bvnKey() ([]byte, error) {
	raw := os.Getenv("BVN_ENCRYPTION_KEY")
	if raw == "" {
		return nil, errors.New("BVN_ENCRYPTION_KEY not configured")
	}
	if key, err := base64.StdEncoding.DecodeString(raw); err == nil && len(key) == 32 {
		return key, nil
	}
	if len(raw) == 32 {
		return []byte(raw), nil
	}
	return nil, errors.New("BVN_ENCRYPTION_KEY must be a base64-encoded 32-byte key (or a raw 32-char string)")
}

// EncryptBVN encrypts a BVN for at-rest storage (AES-256-GCM, random nonce).
// An empty BVN stays empty (BVN is optional in v1).
func EncryptBVN(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key, err := bvnKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return bvnEncPrefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// DecryptBVN reverses EncryptBVN. A value without the enc prefix is returned
// unchanged (legacy plaintext), so reads are safe across the transition.
func DecryptBVN(stored string) (string, error) {
	if stored == "" || !strings.HasPrefix(stored, bvnEncPrefix) {
		return stored, nil
	}
	key, err := bvnKey()
	if err != nil {
		return "", err
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, bvnEncPrefix))
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("invalid BVN ciphertext")
	}
	nonce, ct := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", fmt.Errorf("bvn decrypt: %w", err)
	}
	return string(plaintext), nil
}
