package fileupload

import (
	"errors"
	"strings"
	"testing"

	"github.com/cloudinary/cloudinary-go/api"
	"github.com/cloudinary/cloudinary-go/api/uploader"
)

// The defect that lost sellers' photos: the provider answers with no Go error
// and no URL, and the old code returned ("", nil) — success carrying nothing.
// Callers appended the empty string and saved it.
func TestEmptySecureURLWithNoErrorIsAFailure(t *testing.T) {
	_, _, err := interpretUploadResult(&uploader.UploadResult{SecureURL: ""}, nil)
	if err == nil {
		t.Fatal("an upload returning no URL must be an error; returning it as success is how images became empty strings")
	}
	if !strings.Contains(err.Error(), "empty secure_url") {
		t.Fatalf("the error should name the cause, got %q", err)
	}
}

// Cloudinary reports API-level rejections in the response BODY, not as a Go
// error, so `err == nil` does not mean the upload worked.
func TestProviderReportedRejectionIsAFailure(t *testing.T) {
	result := &uploader.UploadResult{
		SecureURL: "https://res.cloudinary.com/whatever.jpg",
		Error:     api.ErrorResp{Message: "Invalid API key"},
	}
	_, _, err := interpretUploadResult(result, nil)
	if err == nil {
		t.Fatal("a provider-reported rejection must fail even when the SDK returns no error")
	}
	if !strings.Contains(err.Error(), "Invalid API key") {
		t.Fatalf("the provider's reason should survive into the error, got %q", err)
	}
}

func TestTransportErrorIsAFailure(t *testing.T) {
	if _, _, err := interpretUploadResult(nil, errors.New("dial tcp: timeout")); err == nil {
		t.Fatal("a transport error must fail")
	}
	if _, _, err := interpretUploadResult(nil, nil); err == nil {
		t.Fatal("a nil result with no error must fail rather than yield an empty URL")
	}
}

func TestSuccessfulUploadReturnsUrlAndPublicID(t *testing.T) {
	result := &uploader.UploadResult{
		SecureURL: "https://res.cloudinary.com/demo/image/upload/v1/abc.jpg",
		PublicID:  "abc",
	}
	url, publicID, err := interpretUploadResult(result, nil)
	if err != nil {
		t.Fatalf("a good result must not error: %v", err)
	}
	if url != result.SecureURL {
		t.Fatalf("url = %q, want %q", url, result.SecureURL)
	}
	// The public id is what makes orphan cleanup possible after a later failure.
	if publicID != "abc" {
		t.Fatalf("publicID = %q, want abc", publicID)
	}
}
