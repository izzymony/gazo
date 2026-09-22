package fileupload

import (
	"context"
	"strings"
	"testing"
)

// A 1x1 PNG, as a data URI — the shape an edit form actually posts.
const tinyPNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

func TestIsStoredImageRefDistinguishesUrlsFromImageData(t *testing.T) {
	stored := []string{
		"https://res.cloudinary.com/x/image/upload/v1/a.jpg",
		"http://localhost:8088/uploads/a.jpg",
	}
	for _, v := range stored {
		if !IsStoredImageRef(v) {
			t.Fatalf("%q should be recognised as already stored — treating it as image data drops it on edit", v)
		}
	}
	for _, v := range []string{tinyPNG, "iVBORw0KGgo=", ""} {
		if IsStoredImageRef(v) {
			t.Fatalf("%q is image data, not a stored reference", v)
		}
	}
}

// An edit that adds one photo to a product that already has one must keep both.
// The old code base64-decoded EVERY entry, so the stored url failed to decode
// and was silently dropped.
func TestResolveImagesKeepsStoredUrlsAndUploadsOnlyNewData(t *testing.T) {
	withLocalStorage(t)

	const existing = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
	out, err := ResolveImages(context.Background(), []string{existing, tinyPNG})
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 images, got %d (%v)", len(out), out)
	}
	if out[0] != existing {
		t.Fatalf("the already-stored url must survive untouched, got %q", out[0])
	}
	if out[1] == "" || out[1] == tinyPNG {
		t.Fatalf("the new image should have been uploaded, got %q", out[1])
	}
}

// One bad entry in a batch must abort the whole thing. A partial set saved as
// though complete is the defect this guards.
func TestResolveImagesIsAtomicAcrossABatch(t *testing.T) {
	withLocalStorage(t)

	batch := []string{tinyPNG, tinyPNG, "!!! not an image !!!", tinyPNG, tinyPNG}
	out, err := ResolveImages(context.Background(), batch)
	if err == nil {
		t.Fatal("a batch containing an unusable image must fail, not save what it could")
	}
	if out != nil {
		t.Fatalf("a failed resolve must return nothing, got %v", out)
	}
	if !strings.Contains(err.Error(), "image 3") {
		t.Fatalf("the error should name the offending entry, got %q", err)
	}
}

func TestResolveImagesRejectsEmptyEntries(t *testing.T) {
	withLocalStorage(t)

	if _, err := ResolveImages(context.Background(), []string{tinyPNG, ""}); err == nil {
		t.Fatal("an empty image entry must fail — storing it is how photos silently vanished")
	}
}

// Local storage produces http://localhost urls, which resolve from nowhere but
// the machine that wrote them. Allowing it outside local/development is how
// every product image on staging became unreachable.
func TestLocalStorageIsRefusedOutsideLocalAndDevelopment(t *testing.T) {
	for _, env := range []string{"staging", "production", "prod", ""} {
		got := LocalStorageAllowed(fakeEnv(map[string]string{
			"USE_LOCAL_FILE_STORAGE": "true",
			"APP_ENV":                env,
		}))
		if got {
			t.Fatalf("APP_ENV=%q must not permit local file storage", env)
		}
	}

	for _, env := range []string{"local", "development"} {
		if !LocalStorageAllowed(fakeEnv(map[string]string{
			"USE_LOCAL_FILE_STORAGE": "true",
			"APP_ENV":                env,
		})) {
			t.Fatalf("APP_ENV=%q with the flag set should permit local storage", env)
		}
		// ...but only when it is asked for.
		if LocalStorageAllowed(fakeEnv(map[string]string{"APP_ENV": env})) {
			t.Fatalf("APP_ENV=%q must still require USE_LOCAL_FILE_STORAGE", env)
		}
	}
}

func TestResolveImageMapResolvesVariantImages(t *testing.T) {
	withLocalStorage(t)

	out, err := ResolveImageMap(context.Background(), map[string]string{"red": tinyPNG})
	if err != nil {
		t.Fatalf("resolve variant images: %v", err)
	}
	if out["red"] == tinyPNG || out["red"] == "" {
		t.Fatalf("variant image should have been uploaded, got %q", out["red"])
	}
}

func fakeEnv(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

// Routes uploads to local storage so these tests never touch a network.
func withLocalStorage(t *testing.T) {
	t.Helper()
	t.Setenv("USE_LOCAL_FILE_STORAGE", "true")
	t.Setenv("APP_ENV", "local")
	t.Setenv("ENV", "local")
	prev := envGetenv
	envGetenv = fakeEnv(map[string]string{"USE_LOCAL_FILE_STORAGE": "true", "APP_ENV": "local"})
	t.Cleanup(func() { envGetenv = prev })
	t.Chdir(t.TempDir())
}
