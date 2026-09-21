package controller

import (
	"reflect"
	"testing"
)

// The admin client has sent `status` since it was written, and this handler
// ignored it — so every filter tab returned the same unfiltered page. Clicking
// "Paid" listed withdrawals awaiting approval.
//
// Now that the value reaches a query, what it may contain matters.
func TestParseStatusFilter(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want []string
	}{
		{"empty means no filter", "", nil},
		{"whitespace means no filter", "   ", nil},
		{"a single status", "requested", []string{"requested"}},
		{
			name: "a group, which is how one tab counts and fetches the same set",
			raw:  "failed,blocked,reversed,needs_review",
			want: []string{"failed", "blocked", "reversed", "needs_review"},
		},
		{"surrounding whitespace is tolerated", " requested , pending ", []string{"requested", "pending"}},
		{"case is normalised", "REQUESTED,Pending", []string{"requested", "pending"}},
		{"duplicates collapse", "paid,paid,paid", []string{"paid"}},
		{"empty segments are skipped", "paid,,failed,", []string{"paid", "failed"}},
		{"legacy spellings are filterable", "pending,completed", []string{"pending", "completed"}},

		// The important ones. An unrecognised value must NOT reach the query,
		// and must NOT widen the result to everything — a typo should show an
		// empty list for that filter, which is visibly wrong, rather than
		// silently listing every withdrawal on the platform.
		{"an unknown status is dropped", "not_a_status", nil},
		{"a typo is dropped, the valid part survives", "requested,requsted", []string{"requested"}},
		{"SQL-ish input is dropped rather than forwarded", "paid'; DROP TABLE withdrawal_requests;--", nil},
		{"a wildcard is not a status", "*", nil},
		{"an empty-string status is not accepted", "''", nil},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := parseStatusFilter(c.raw)
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("parseStatusFilter(%q) = %#v, want %#v", c.raw, got, c.want)
			}
		})
	}
}

// Every status the UI can offer must survive parsing, or a tab silently
// filters to nothing.
func TestParseStatusFilter_AcceptsEveryStatusTheUIOffers(t *testing.T) {
	uiGroups := []string{
		"requested,pending",
		"processing,awaiting_otp",
		"paid,completed",
		"failed,blocked,reversed,needs_review",
		"rejected",
	}
	for _, group := range uiGroups {
		t.Run(group, func(t *testing.T) {
			got := parseStatusFilter(group)
			wantLen := len(splitCSV(group))
			if len(got) != wantLen {
				t.Errorf("parseStatusFilter(%q) kept %d of %d statuses (%v) — a tab that "+
					"loses a status filters to a narrower set than its badge counted",
					group, len(got), wantLen, got)
			}
		})
	}
}

func splitCSV(s string) []string {
	var out []string
	cur := ""
	for _, r := range s {
		if r == ',' {
			if cur != "" {
				out = append(out, cur)
			}
			cur = ""
			continue
		}
		cur += string(r)
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}
