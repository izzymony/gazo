package fileupload

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go"
	"github.com/cloudinary/cloudinary-go/api/uploader"
)

// uploadTimeout bounds a single asset upload. Without it a stalled provider
// call holds the request open until the client gives up, which is how a slow
// dependency turns into an application that appears to hang.
const uploadTimeout = 60 * time.Second

// UploadFileCloudinary uploads one file and returns its secure URL.
func UploadFileCloudinary(file io.Reader) (string, error) {
	url, _, err := UploadImageCloudinary(context.Background(), file)
	return url, err
}

// UploadImageCloudinary uploads one file, returning its secure URL and the
// public id needed to delete it again.
//
// THREE ways an upload can fail, and the original code caught only one:
//
//  1. a transport/SDK error — `err != nil`
//  2. a provider-reported rejection — the API answers 200 with an `error`
//     object in the body, which the SDK surfaces as `result.Error`, NOT as an
//     error return
//  3. a response carrying neither an error nor a URL
//
// Returning `result.SecureURL, nil` meant (2) and (3) were reported as
// SUCCESS with an empty string. Callers appended that empty string to the
// product's image list and saved it, so a seller's photos vanished while the
// save reported success. An upload that produces no URL is a failed upload.
func UploadImageCloudinary(ctx context.Context, file io.Reader) (string, string, error) {
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return "", "", fmt.Errorf("cloudinary is not configured: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, uploadTimeout)
	defer cancel()

	result, err := cld.Upload.Upload(ctx, file, uploader.UploadParams{})
	return interpretUploadResult(result, err)
}

// interpretUploadResult decides whether an upload actually produced an asset.
//
// Separated from the network call so the three failure shapes can be tested
// without a provider. The original code was simply `return result.SecureURL,
// nil`, which reported two of them as success with an empty string.
func interpretUploadResult(result *uploader.UploadResult, err error) (string, string, error) {
	if err != nil {
		return "", "", fmt.Errorf("cloudinary upload failed: %w", err)
	}
	if result == nil {
		return "", "", fmt.Errorf("cloudinary returned no result")
	}
	// A provider-reported rejection arrives in the BODY with a nil error.
	if msg := strings.TrimSpace(result.Error.Message); msg != "" {
		return "", "", fmt.Errorf("cloudinary rejected the upload: %s", msg)
	}
	// No error and no URL: an upload that produced nothing is a failed upload.
	if strings.TrimSpace(result.SecureURL) == "" {
		return "", "", fmt.Errorf("cloudinary returned an empty secure_url")
	}
	return result.SecureURL, result.PublicID, nil
}

// DeleteCloudinaryAsset removes an uploaded asset. Best-effort: used to tidy up
// assets uploaded earlier in a request that later failed, so a rejected save
// does not leave orphans behind. Its error is for logging, not for failing the
// request — the request has already failed for a better reason.
func DeleteCloudinaryAsset(ctx context.Context, publicID string) error {
	if strings.TrimSpace(publicID) == "" {
		return nil
	}
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, uploadTimeout)
	defer cancel()

	_, err = cld.Upload.Destroy(ctx, uploader.DestroyParams{PublicID: publicID})
	return err
}
