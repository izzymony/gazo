package requests

import (
	"mime/multipart"
)

type SubmitKYCRequest struct {
	DocumentFile *multipart.FileHeader `form:"document" binding:"required"`
	SelfieFile   *multipart.FileHeader `form:"selfie" binding:"required"`
	DocumentType string                `form:"document_type"` // nin | national_id | passport | drivers_license
	LegalName    string                `form:"legal_name"`    // must match ID + payout account (reviewer name-match)
	BVN          string                `form:"bvn"`           // optional in v1
}
