package helper

import (
	"strings"
	"testing"
)

// A raw 32-char key (bvnKey accepts a raw 32-char string as well as base64).
const testBVNKey = "0123456789abcdef0123456789abcdef"

func TestBVN_EncryptDecryptRoundTrip(t *testing.T) {
	t.Setenv("BVN_ENCRYPTION_KEY", testBVNKey)
	const bvn = "22212345678"

	enc, err := EncryptBVN(bvn)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if enc == bvn {
		t.Fatal("ciphertext equals plaintext — BVN not encrypted")
	}
	if !strings.HasPrefix(enc, bvnEncPrefix) {
		t.Fatalf("ciphertext missing enc marker: %q", enc)
	}
	if strings.Contains(enc, bvn) {
		t.Fatalf("plaintext BVN leaks into ciphertext: %q", enc)
	}

	dec, err := DecryptBVN(enc)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if dec != bvn {
		t.Fatalf("roundtrip mismatch: got %q want %q", dec, bvn)
	}
}

func TestBVN_EmptyStaysEmpty(t *testing.T) {
	t.Setenv("BVN_ENCRYPTION_KEY", testBVNKey)
	enc, err := EncryptBVN("")
	if err != nil || enc != "" {
		t.Fatalf("empty BVN should stay empty: got %q err %v", enc, err)
	}
}

func TestBVN_LegacyPlaintextPassesThrough(t *testing.T) {
	t.Setenv("BVN_ENCRYPTION_KEY", testBVNKey)
	// A value without the enc marker (pre-encryption row) is returned unchanged.
	dec, err := DecryptBVN("22212345678")
	if err != nil || dec != "22212345678" {
		t.Fatalf("legacy plaintext should pass through: got %q err %v", dec, err)
	}
}

func TestBVN_MissingKeyIsHardError(t *testing.T) {
	t.Setenv("BVN_ENCRYPTION_KEY", "")
	if _, err := EncryptBVN("22212345678"); err == nil {
		t.Fatal("expected a hard error when BVN_ENCRYPTION_KEY is unset — must never store PII in the clear")
	}
}
