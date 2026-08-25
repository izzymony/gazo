package helper

// CodedError carries a machine-readable code alongside a user-facing message,
// so handlers can emit a stable `error_code` (e.g. "KYC_REQUIRED") instead of the
// client string-matching on the message. The Error() string is the message, so
// existing callers that only read err.Error() are unaffected.
type CodedError struct {
	Code    string
	Message string
}

func (e *CodedError) Error() string { return e.Message }

// NewCodedError builds a CodedError.
func NewCodedError(code, message string) *CodedError {
	return &CodedError{Code: code, Message: message}
}

// Well-known error codes.
const CodeKYCRequired = "KYC_REQUIRED"
