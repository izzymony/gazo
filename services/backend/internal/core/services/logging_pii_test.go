package services

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/sirupsen/logrus"
)

// Sentinels shared with the database-level test, deliberately distinctive so a
// single occurrence anywhere in captured output is unambiguous.
const (
	piiEmail    = "pii-probe-9f31@sentinel.example"
	piiPhone    = "+2349001234567"
	piiStreet   = "77 Sentinel Crescent, Probeville"
	piiOTP      = "902137"
	piiOAuthTok = "oauth-access-token-SENTINEL-4a91f"
	piiProvTok  = "provider-request-token-SENTINEL-77b2"
)

func piiSentinels() map[string]string {
	return map[string]string{
		"email":          piiEmail,
		"phone":          piiPhone,
		"street address": piiStreet,
		"otp":            piiOTP,
		"oauth token":    piiOAuthTok,
		"provider token": piiProvTok,
	}
}

// captureLogs redirects the application logger (logrus, used by
// internal/logger) into a buffer for the duration of fn.
func captureLogs(t *testing.T, fn func()) string {
	t.Helper()
	var buf bytes.Buffer
	previous := logrus.StandardLogger().Out
	previousLevel := logrus.GetLevel()
	logrus.SetOutput(&buf)
	logrus.SetLevel(logrus.DebugLevel) // capture everything, including Info
	t.Cleanup(func() {
		logrus.SetOutput(previous)
		logrus.SetLevel(previousLevel)
	})
	fn()
	return buf.String()
}

func assertNoPII(t *testing.T, captured, context string) {
	t.Helper()
	for label, value := range piiSentinels() {
		if strings.Contains(captured, value) {
			t.Errorf("%s: the %s sentinel reached the log.\n  value: %s\n  log: %s",
				context, label, value, captured)
		}
	}
}

// The OTP bypass path, under STAGING configuration.
//
// It printed `identifier: <email or phone>, otp: <code>, type: …` and was
// labelled [LOCAL] — but the branch runs whenever OTPBypassAllowed(), which is
// true for local, development AND staging. So live one-time codes and the
// contact they were sent to were written to staging's retained logs.
func TestOTPBypass_LogsNoIdentifierOrCode(t *testing.T) {
	for _, env := range []string{"staging", "development", "local"} {
		t.Run(env, func(t *testing.T) {
			t.Setenv("APP_ENV", env)
			t.Setenv("ENV", env)

			db, _ := openTestDB(t)
			svc := NewVerificationCodeService(db)

			captured := captureLogs(t, func() {
				// Any OTP is accepted on this path; what matters is what it logs.
				if err := svc.ValidateCode(piiEmail, piiOTP, "register"); err != nil {
					t.Fatalf("the bypass path returned an error: %v", err)
				}
				if err := svc.ValidateCode(piiPhone, piiOTP, "withdrawal"); err != nil {
					t.Fatalf("the bypass path returned an error: %v", err)
				}
			})

			assertNoPII(t, captured, "otp bypass in "+env)
			// The flow name is the part worth keeping, so the log still says
			// something.
			if !strings.Contains(captured, "register") {
				t.Errorf("the bypass was not recorded at all; log was: %s", captured)
			}
		})
	}
}

// Production must not take the bypass at all — there is nothing to log because
// the code is genuinely validated.
func TestOTPBypass_NotTakenInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("ENV", "production")

	db, _ := openTestDB(t)
	svc := NewVerificationCodeService(db)

	captured := captureLogs(t, func() {
		// No such code exists, so production rejects it.
		if err := svc.ValidateCode(piiEmail, piiOTP, "register"); err == nil {
			t.Error("production accepted an OTP that was never issued")
		}
	})
	assertNoPII(t, captured, "otp validation in production")
	if strings.Contains(captured, "bypassed") {
		t.Error("production took the bypass path")
	}
}

// ---------------------------------------------------------------------------
// Source guard. The SECONDARY net: it catches a future log call that
// interpolates something sensitive at a site the behavioural tests above
// cannot reach — the OAuth token exchange, which needs a live provider
// endpoint, and the provider-token path inside CreateShipment.
//
// Explicitly not the only protection: the database logger and the OTP bypass
// are proven by captured output above, and the Shipbubble client has its own
// captured-output tests.
// ---------------------------------------------------------------------------

func backendRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("resolve backend root: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("not the backend root (%s): %v", root, err)
	}
	return root
}

// stripComments blanks line comments so the notes recording what was removed —
// which necessarily name it — are not read as code.
// Named distinctly from the identically-shaped helper in
// money_safety_repro_test.go, which compiles alongside this file under that
// build tag — a collision the default `go test` run does not surface.
func stripGoLineComments(src string) string {
	var out strings.Builder
	for _, line := range strings.Split(src, "\n") {
		if i := strings.Index(line, "//"); i >= 0 {
			line = line[:i]
		}
		out.WriteString(line)
		out.WriteByte('\n')
	}
	return out.String()
}

var logCallRe = regexp.MustCompile(
	`(?:fmt\.Print(?:f|ln)?|log\.(?:Print|Printf|Println|Fatal|Fatalf)|logger\.(?:Info|Error|Warn|Debug))\([^\n]*`)

// Expressions that must never be interpolated into a log call.
var forbiddenInLogs = []struct{ expr, why string }{
	{".Email", "a customer or admin email address"},
	{".Phone", "a phone number"},
	{".Street", "a street address"},
	{".Town", "a town"},
	{".Firstname", "a person's name"},
	{".Lastname", "a person's name"},
	{".FirstName", "a person's name"},
	{".LastName", "a person's name"},
	{".OTP", "a one-time code"},
	{"input.Otp", "a one-time code"},
	{"access_token", "an OAuth access token"},
	{"accessToken", "an OAuth access token"},
	{"requestToken", "a provider request token — it authenticates the booking"},
	{"RequestToken", "a provider request token"},
	{"string(body)", "a raw provider response body"},
	{"string(bodyBytes)", "a raw provider response body"},
	{"bodyString", "a raw provider response body"},
	{"%+v", "a whole struct, which is how a body reaches a log by accident"},
	{"%#v", "a whole struct"},
}

// Files where a match is legitimate, with the reason. Narrow on purpose.
var logGuardExempt = map[string]string{
	// Operator CLIs print to a terminal, not to a retained server log, and
	// these print bank names rather than personal data.
	"cmd/bank-codes/main.go":         "operator CLI, terminal output",
	"cmd/paystack-preflight/main.go": "operator CLI, terminal output",
}

func TestNoSensitiveValuesInLogCalls(t *testing.T) {
	root := backendRoot(t)
	var offences []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if name := info.Name(); name == ".git" || name == "logs" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		rel = filepath.ToSlash(rel)
		if _, ok := logGuardExempt[rel]; ok {
			return nil
		}

		raw, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		for _, call := range logCallRe.FindAllString(stripGoLineComments(string(raw)), -1) {
			for _, f := range forbiddenInLogs {
				if strings.Contains(call, f.expr) {
					offences = append(offences, "  "+rel+": logs "+f.why+
						" ("+f.expr+")\n      "+strings.TrimSpace(call))
				}
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk: %v", err)
	}

	if len(offences) > 0 {
		t.Errorf("%d log call(s) interpolate something that must not be logged:\n%s",
			len(offences), strings.Join(offences, "\n"))
	}
}

// The guard must actually fire — a source check nobody has seen fail is not
// known to work.
func TestNoSensitiveValuesInLogCalls_GuardDetectsAPlantedCall(t *testing.T) {
	planted := `package x
func f(user User) {
	logger.Info(fmt.Sprintf("signed in: %s", user.Email))
	fmt.Printf("token; %v", accessToken)
	log.Printf("payload %+v", req)
}
`
	var found []string
	for _, call := range logCallRe.FindAllString(stripGoLineComments(planted), -1) {
		for _, f := range forbiddenInLogs {
			if strings.Contains(call, f.expr) {
				found = append(found, f.expr)
			}
		}
	}
	for _, want := range []string{".Email", "accessToken", "%+v"} {
		var hit bool
		for _, got := range found {
			if got == want {
				hit = true
			}
		}
		if !hit {
			t.Errorf("the guard did not detect %q in the planted source", want)
		}
	}
}

// And it must not fire on a comment explaining a removal.
func TestNoSensitiveValuesInLogCalls_CommentsAreNotCode(t *testing.T) {
	commented := `package x
func f() {
	// Was: logger.Info(fmt.Sprintf("signed in: %s", user.Email))
	logger.Info("signed in")
}
`
	for _, call := range logCallRe.FindAllString(stripGoLineComments(commented), -1) {
		for _, f := range forbiddenInLogs {
			if strings.Contains(call, f.expr) {
				t.Errorf("the guard read a comment as code: matched %q in %q", f.expr, call)
			}
		}
	}
}
