package fileupload

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/google/uuid"
)

// UploadFileLocal uploads file to local storage for development
func UploadFileLocal(file io.Reader) (string, error) {
	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s.jpg", time.Now().Unix(), uuid.New().String()[:8])
	filePath := filepath.Join(uploadDir, filename)

	// Create the file
	outFile, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer outFile.Close()

	// Copy the file data
	_, err = io.Copy(outFile, file)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Return the public URL (assuming backend serves static files)
	publicURL := fmt.Sprintf("http://localhost:8088/uploads/%s", filename)
	return publicURL, nil
}

// LocalStorageAllowed reports whether writing uploads to the container's own
// disk is acceptable here.
//
// Only in local/development, and only when explicitly asked for. Those files
// are served from http://localhost:8088, which is reachable from nowhere but
// the machine that wrote them — so on staging or production a "successful"
// local upload produces a URL that every browser fails to load. Silent
// breakage; every product image on staging is currently of this form.
func LocalStorageAllowed(getenv func(string) string) bool {
	if getenv("USE_LOCAL_FILE_STORAGE") != "true" {
		return false
	}
	switch helper.ResolveEnv(getenv) {
	case "local", "development":
		return true
	}
	return false
}

// UploadFileWithFallback uploads a file, using local storage only where that is
// legitimate.
//
// It used to fall back to local storage whenever Cloudinary was unconfigured or
// failed, in ANY environment — which is why staging is full of localhost URLs.
// Outside local/development a provider failure is now an error: a broken upload
// should fail loudly at the point of upload, not resurface later as an image
// nobody can load.
func UploadFileWithFallback(file io.Reader) (string, error) {
	if LocalStorageAllowed(os.Getenv) {
		return UploadFileLocal(file)
	}

	url, err := UploadImageCloudinaryURL(file)
	if err == nil {
		return url, nil
	}

	// A misconfigured local box should still be able to work offline; a
	// deployed environment must not paper over a broken uploader.
	if !helper.IsProduction() && helper.ResolveEnv(os.Getenv) == "local" {
		return UploadFileLocal(file)
	}
	return "", err
}

// UploadImageCloudinaryURL is the URL-only form, kept so existing callers that
// do not need a public id are unaffected.
func UploadImageCloudinaryURL(file io.Reader) (string, error) {
	url, _, err := UploadImageCloudinary(context.Background(), file)
	return url, err
}
