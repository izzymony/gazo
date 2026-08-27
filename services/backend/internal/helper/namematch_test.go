package helper

import "testing"

func TestNameMatchLevel(t *testing.T) {
	cases := []struct {
		legal, acct, want string
	}{
		{"John Doe", "JOHN DOE", "match"},
		{"John Doe", "DOE JOHN", "match"},          // order-independent
		{"John Doe", "DOE JOHN MICHAEL", "match"},  // account has an extra middle name
		{"John Michael Doe", "DOE JOHN", "match"},  // legal has the extra middle name
		{"  john   doe ", "John-Doe", "match"},     // whitespace + punctuation
		{"John Doe", "JOHN SMITH", "partial"},      // share only "john"
		{"John Doe", "MARY JANE", "mismatch"},      // nothing shared
		{"", "JOHN DOE", "mismatch"},               // empty legal name
		{"John Doe", "", "mismatch"},               // empty account name
	}
	for _, c := range cases {
		if got := NameMatchLevel(c.legal, c.acct); got != c.want {
			t.Errorf("NameMatchLevel(%q, %q) = %q, want %q", c.legal, c.acct, got, c.want)
		}
	}
}

func TestMaskAccountNumber(t *testing.T) {
	cases := []struct{ in, want string }{
		{"0123456789", "******6789"},
		{"1234", "1234"},
		{"12", "12"},
		{"", ""},
	}
	for _, c := range cases {
		if got := MaskAccountNumber(c.in); got != c.want {
			t.Errorf("MaskAccountNumber(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
