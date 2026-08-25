package fileupload

import "testing"

// The signed authenticated-URL path needs a real Cloudinary account, so here we
// verify the routing that is testable without one: any reference WITHOUT the
// `cld-auth:` marker (a legacy public URL, or a local-storage dev URL) must be
// returned unchanged, so KYC_PRIVATE_STORAGE=false stays behaviour-preserving.
func TestSignedKYCURL_PassThroughNonPrivate(t *testing.T) {
	cases := []string{
		"https://res.cloudinary.com/demo/image/upload/v1/legacy.jpg", // legacy public
		"http://localhost:8088/uploads/abc.jpg",                      // local dev
		"",
	}
	for _, in := range cases {
		got, err := SignedKYCURL(in)
		if err != nil {
			t.Fatalf("SignedKYCURL(%q) unexpected error: %v", in, err)
		}
		if got != in {
			t.Fatalf("SignedKYCURL(%q) = %q, want unchanged", in, got)
		}
	}
}
