package shipping

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

// A source guard on the logging, because the thing that regresses here is a
// debug print added while chasing a bug and never removed. That is literally
// how this code got the way it was: nine `🔥 SHIPBUBBLE DEBUG` lines printing
// the request payload, the whole response body, and the buyer's name, email,
// phone and street address on every quote — into Render's retained logs.
//
// Checked against source rather than by capturing output because the offending
// calls were `fmt.Printf` straight to stdout, which no logger hook can see.

// Fields that identify a person or a place.
var piiFields = []string{
	"Address", "Street", "Town", "Email", "Phone",
	"FirstName", "LastName", "ShippingUser",
}

// Fields that carry RESPONSE CONTENT. Distinct from piiFields and just as
// important: Shipbubble echoes the submitted address and phone inside its
// `message`, so `.Message` is a PII carrier even though its name says nothing
// about people. Missing this is why reinstating the provider message into the
// zero-courier log went undetected by the first version of this guard.
var bodyFields = []string{
	".Message", ".Status", "string(raw)", "string(body)", "rawMessage",
}

func readSource(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(b)
}

// stripComments removes line comments, so the notes explaining what was removed
// — which necessarily quote it — are not read as code.
func stripComments(src string) string {
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

// The provider client must not print directly at all. Everything goes through
// the logger, so output is structured and filterable.
func TestShipbubbleClient_UsesNoDirectPrinting(t *testing.T) {
	for _, file := range []string{"shipbubbleService.go", "shipbubbleTransport.go", "shipbubbleConfig.go"} {
		src := stripComments(readSource(t, file))
		for _, banned := range []string{"fmt.Printf(", "fmt.Println(", "print(", "println("} {
			if strings.Contains(src, banned) {
				t.Errorf("%s calls %s — provider diagnostics must go through the logger, "+
					"where they can be levelled and filtered", file, banned)
			}
		}
	}
}

// No log call in the shipping package may interpolate a PII-bearing field.
func TestShipbubbleClient_LogsNoCustomerData(t *testing.T) {
	logCall := regexp.MustCompile(`logger\.(Info|Error|Warn)\([^\n]*`)

	for _, file := range []string{"shipbubbleService.go", "shipbubbleTransport.go", "shipbubbleConfig.go"} {
		src := stripComments(readSource(t, file))
		for _, call := range logCall.FindAllString(src, -1) {
			for _, field := range piiFields {
				// `.Field` or `Field:` — a struct read or a keyed literal.
				if strings.Contains(call, "."+field) {
					t.Errorf("%s logs a PII field (.%s): %s", file, field, strings.TrimSpace(call))
				}
			}
			for _, field := range bodyFields {
				if strings.Contains(call, field) {
					t.Errorf("%s logs response content (%s) — Shipbubble echoes the "+
						"submitted address and phone in its message: %s",
						file, field, strings.TrimSpace(call))
				}
			}
			// Whole-struct formatting is how a body reaches a log by accident.
			for _, wholeStruct := range []string{"%+v", "%#v"} {
				if strings.Contains(call, wholeStruct) {
					t.Errorf("%s formats a whole value with %s in a log call: %s",
						file, wholeStruct, strings.TrimSpace(call))
				}
			}
		}
	}
}

// The response body must never be turned into a string outside the bounded,
// discarded read and the structured-error decode.
func TestShipbubbleClient_NeverStringifiesABody(t *testing.T) {
	src := stripComments(readSource(t, "shipbubbleTransport.go"))
	for _, banned := range []string{"string(raw)", "string(body)", "string(bodyBytes)", "string(jsonData)"} {
		if strings.Contains(src, banned) {
			t.Errorf("shipbubbleTransport.go contains %q — a body must not become a "+
				"loggable string", banned)
		}
	}
}

// The API key must never be interpolated anywhere. It was printed in full on
// every boot once already.
func TestShipbubbleClient_NeverPrintsTheKey(t *testing.T) {
	for _, file := range []string{"shipbubbleService.go", "shipbubbleTransport.go", "shipbubbleConfig.go"} {
		src := stripComments(readSource(t, file))
		logCall := regexp.MustCompile(`logger\.(Info|Error|Warn)\([^\n]*`)
		for _, call := range logCall.FindAllString(src, -1) {
			for _, banned := range []string{"s.apiKey", "cfg.APIKey", "APIKey,"} {
				if strings.Contains(call, banned) {
					t.Errorf("%s logs the API key: %s", file, strings.TrimSpace(call))
				}
			}
		}
	}
}

// The caller is covered too: it held the largest single PII print in the
// codebase (seller phone + email, buyer name + email + phone + full address).
func TestShippingService_LogsNoCustomerData(t *testing.T) {
	src := stripComments(readSource(t, "../../services/shippingService.go"))

	// The specific removed lines, by their distinctive text.
	for _, gone := range []string{
		"CRITICAL DEBUG - Calling Shipbubble ValidateAddress",
		"Receiver Data - Name:",
		"Business Phone: %s, Email: %s",
		`fmt.Println("shipBubbleResponse"`,
		`fmt.Println("creating shipping option: "`,
		"GetShippingOptions called with ProductId: %s, Street:",
	} {
		if strings.Contains(src, gone) {
			t.Errorf("shippingService.go still contains %q", gone)
		}
	}

	// And nothing may print the request's address parts.
	printCall := regexp.MustCompile(`fmt\.Print(f|ln)?\([^\n]*`)
	for _, call := range printCall.FindAllString(src, -1) {
		for _, field := range []string{"request.Street", "request.Town", "request.State",
			"request.Country", "ShippingUser", "receiverAddress", "business.Phone", "business.Email"} {
			if strings.Contains(call, field) {
				t.Errorf("shippingService.go prints %s: %s", field, strings.TrimSpace(call))
			}
		}
	}
}
