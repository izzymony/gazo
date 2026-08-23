package fileupload

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

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

// UploadFileWithFallback tries Cloudinary first, falls back to local storage
func UploadFileWithFallback(file io.Reader) (string, error) {
	// Check if we should use local storage
	if os.Getenv("USE_LOCAL_FILE_STORAGE") == "true" {
		return UploadFileLocal(file)
	}

	// Check if Cloudinary is properly configured
	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	if cloudinaryURL == "" || cloudinaryURL == "cloudinary://test:test@test" {
		return UploadFileLocal(file)
	}

	// Try Cloudinary first
	url, err := UploadFileCloudinary(file)
	if err != nil {
		// If Cloudinary fails, fall back to local storage
		return UploadFileLocal(file)
	}

	return url, nil
}