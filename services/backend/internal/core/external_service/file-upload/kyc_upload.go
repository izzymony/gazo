package fileupload

import (
	"context"
	"io"
	"os"
	"strings"

	"github.com/cloudinary/cloudinary-go"
	"github.com/cloudinary/cloudinary-go/api"
	"github.com/cloudinary/cloudinary-go/api/uploader"
)

// kycAuthPrefix marks a stored KYC file reference as a Cloudinary *authenticated*
// (private-delivery) asset. The value after the prefix is the public_id, which
// SignedKYCURL turns into a short signed URL on read. References without the
// prefix (legacy public URLs, or local-storage URLs in dev) are served as-is.
const kycAuthPrefix = "cld-auth:"

// UploadKYCFile uploads a KYC document/selfie (R5, NDPR).
//
// When KYC_PRIVATE_STORAGE=true and real Cloudinary is configured, it uploads
// with authenticated (private) delivery so the asset is NOT publicly fetchable,
// and returns a `cld-auth:<public_id>` reference. It is env-gated so the secure
// mode only activates once the owner confirms Cloudinary authenticated delivery
// on their account; until then it uses the legacy public path (behaviour-
// preserving). It never silently falls back to a PUBLIC upload for KYC PII — on
// a Cloudinary error it returns the error rather than storing the doc publicly.
func UploadKYCFile(file io.Reader) (string, error) {
	if os.Getenv("KYC_PRIVATE_STORAGE") != "true" {
		return UploadFileWithFallback(file) // legacy public path (pre-R5)
	}
	if os.Getenv("USE_LOCAL_FILE_STORAGE") == "true" {
		return UploadFileLocal(file) // local files aren't publicly served (dev)
	}
	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	if cloudinaryURL == "" || cloudinaryURL == "cloudinary://test:test@test" {
		return UploadFileLocal(file)
	}
	cld, err := cloudinary.NewFromURL(cloudinaryURL)
	if err != nil {
		return "", err
	}
	res, err := cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		Type:   api.Authenticated,
		Folder: "kyc",
	})
	if err != nil {
		return "", err // do NOT fall back to a public upload for KYC PII
	}
	return kycAuthPrefix + res.PublicID, nil
}

// SignedKYCURL resolves a stored KYC file reference to a viewable URL. A
// `cld-auth:` reference becomes a signed authenticated Cloudinary URL; any other
// value (local URL, or a legacy public URL) is returned unchanged.
func SignedKYCURL(ref string) (string, error) {
	if !strings.HasPrefix(ref, kycAuthPrefix) {
		return ref, nil
	}
	publicID := strings.TrimPrefix(ref, kycAuthPrefix)
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return "", err
	}
	img, err := cld.Image(publicID)
	if err != nil {
		return "", err
	}
	img.DeliveryType = api.Authenticated
	img.Config.URL.SignURL = true
	return img.String()
}
