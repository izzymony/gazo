package requests

import (
	"bytes"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// The edit-profile screen submits an avatar change as multipart/form-data.
// Gin maps a multipart body by the `form` tag and falls back to the Go FIELD
// NAME when one is absent — so with json tags only, every field bound empty,
// binding:"required" on Firstname failed, and UpdateUser answered
// 400 {"error":"invalid request"} on every avatar change while the UI still
// claimed success. Removing the form tags fails this test.
func TestUpdateUserRequestBindsMultipartFormKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	fileWriter, err := writer.CreateFormFile("profile_image", "avatar.png")
	if err != nil {
		t.Fatalf("CreateFormFile: %v", err)
	}
	if _, err := fileWriter.Write([]byte{0x89, 0x50, 0x4e, 0x47}); err != nil {
		t.Fatalf("write file bytes: %v", err)
	}

	// Exactly the field names apps/web appends on the avatar path.
	fields := map[string]string{
		"firstname":     "Michael",
		"lastname":      "Adeyemi",
		"username":      "michael",
		"date_of_birth": "1990-01-01",
	}
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("WriteField %q: %v", key, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest("PUT", "/users/update-user", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req

	var got UpdateUserRequest
	if err := c.ShouldBind(&got); err != nil {
		t.Fatalf("ShouldBind: %v — the handler turns this into 400 \"invalid request\"", err)
	}

	if got.Firstname != "Michael" {
		t.Errorf("Firstname = %q, want %q", got.Firstname, "Michael")
	}
	if got.Lastname != "Adeyemi" {
		t.Errorf("Lastname = %q, want %q", got.Lastname, "Adeyemi")
	}
	if got.Username != "michael" {
		t.Errorf("Username = %q, want %q", got.Username, "michael")
	}
	if got.DateOfBirth != "1990-01-01" {
		t.Errorf("DateOfBirth = %q, want %q", got.DateOfBirth, "1990-01-01")
	}
	// The uploaded file must NOT be mapped onto the string field — the handler
	// uploads it and assigns the resulting URL.
	if got.ProfileImage != "" {
		t.Errorf("ProfileImage = %q, want empty (handler assigns the uploaded URL)", got.ProfileImage)
	}
}

// Adding form tags must not disturb the JSON path the no-image submit uses.
func TestUpdateUserRequestStillBindsJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := `{"firstname":"Michael","lastname":"Adeyemi","username":"michael","date_of_birth":"1990-01-01"}`
	req := httptest.NewRequest("PUT", "/users/update-user", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req

	var got UpdateUserRequest
	if err := c.ShouldBind(&got); err != nil {
		t.Fatalf("ShouldBind JSON: %v", err)
	}
	if got.Firstname != "Michael" || got.Username != "michael" || got.DateOfBirth != "1990-01-01" {
		t.Errorf("JSON bind mismatch: %+v", got)
	}
}
