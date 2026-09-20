package fileupload

import (
	"context"
	"fmt"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

// IsStoredImageRef reports whether a value is already a stored image rather than
// new image data awaiting upload.
//
// An edit form posts BOTH: the images already on the product come back as the
// URLs they were stored as, and only newly-added ones arrive as data URIs.
// Treating every entry as base64 — which is what the product service did —
// means an ordinary edit that touches only the title re-uploads nothing and
// DROPS every existing image.
func IsStoredImageRef(value string) bool {
	v := strings.TrimSpace(value)
	return strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://")
}

// ResolveImages turns a mixed list of stored URLs and new image data into a
// list of stored URLs, preserving order.
//
// Atomic: if ANY entry fails, nothing is returned and the assets uploaded
// earlier in this same call are deleted on a best-effort basis, so a rejected
// save does not leave orphans in the asset store. The caller must abandon the
// write — a partial image set saved as though complete is the defect this
// exists to prevent.
func ResolveImages(ctx context.Context, values []string) ([]string, error) {
	resolved := make([]string, 0, len(values))
	uploaded := make([]string, 0, len(values)) // public ids, for rollback

	rollback := func() {
		for _, id := range uploaded {
			if err := DeleteCloudinaryAsset(ctx, id); err != nil {
				// Best-effort by design: the request is already failing for a
				// better reason. Say so, so an orphan can be found later.
				logger.Error(fmt.Sprintf("could not delete orphaned upload %s: %v", id, err))
			}
		}
	}

	for i, value := range values {
		if strings.TrimSpace(value) == "" {
			rollback()
			return nil, fmt.Errorf("image %d is empty", i+1)
		}

		// Already stored — keep it exactly as it is.
		if IsStoredImageRef(value) {
			resolved = append(resolved, value)
			continue
		}

		decoded, err := helper.DecodeBase64Image(value)
		if err != nil {
			rollback()
			return nil, fmt.Errorf("image %d is not a valid image: %w", i+1, err)
		}

		if LocalStorageAllowed(envGetenv) {
			url, err := UploadFileLocal(decoded)
			if err != nil {
				rollback()
				return nil, fmt.Errorf("image %d could not be stored: %w", i+1, err)
			}
			resolved = append(resolved, url)
			continue
		}

		url, publicID, err := UploadImageCloudinary(ctx, decoded)
		if err != nil {
			rollback()
			return nil, fmt.Errorf("image %d could not be uploaded: %w", i+1, err)
		}
		uploaded = append(uploaded, publicID)
		resolved = append(resolved, url)
	}

	return resolved, nil
}

// ResolveImageMap is ResolveImages for variant images, which are keyed by
// variant value. Variant images were never uploaded at all — whatever the
// client sent was written straight to the database, so a data URI was stored
// verbatim as though it were a URL.
func ResolveImageMap(ctx context.Context, values map[string]string) (map[string]string, error) {
	if len(values) == 0 {
		return values, nil
	}
	// Stable order, so a failure message names the same entry every run.
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sortStrings(keys)

	ordered := make([]string, 0, len(keys))
	for _, k := range keys {
		ordered = append(ordered, values[k])
	}

	resolved, err := ResolveImages(ctx, ordered)
	if err != nil {
		return nil, err
	}

	out := make(map[string]string, len(keys))
	for i, k := range keys {
		out[k] = resolved[i]
	}
	return out, nil
}
