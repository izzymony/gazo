package helper

import (
	"regexp"
	"strings"
)

var nonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

// nameTokens normalises a name into a set of lowercase alphanumeric tokens
// (word order is intentionally discarded).
func nameTokens(s string) map[string]struct{} {
	s = strings.ToLower(strings.TrimSpace(s))
	set := map[string]struct{}{}
	for _, tok := range nonAlnum.Split(s, -1) {
		if tok != "" {
			set[tok] = struct{}{}
		}
	}
	return set
}

// NameMatchLevel compares a submitted KYC legal name against a payout-account
// name (both Paystack-resolved). The comparison is case / whitespace /
// punctuation-insensitive and order-independent — banks return names as
// "SURNAME FIRSTNAME MIDDLE". It returns:
//
//	"match"    — one name's token set is a subset of the other (same person,
//	             possibly with an extra middle name or reordered)
//	"partial"  — they share at least one token but neither is a subset
//	"mismatch" — no shared tokens (or either name is empty)
//
// This is a review AID for the admin, never an authoriser — the admin still
// eyeballs the result before approving.
func NameMatchLevel(legalName, accountName string) string {
	l := nameTokens(legalName)
	a := nameTokens(accountName)
	if len(l) == 0 || len(a) == 0 {
		return "mismatch"
	}
	shared := 0
	for t := range l {
		if _, ok := a[t]; ok {
			shared++
		}
	}
	switch {
	case shared == len(l) || shared == len(a):
		return "match"
	case shared >= 1:
		return "partial"
	default:
		return "mismatch"
	}
}

// MaskAccountNumber keeps only the last 4 digits visible, e.g. "0123456789" →
// "******6789". Short values are returned unchanged.
func MaskAccountNumber(n string) string {
	n = strings.TrimSpace(n)
	if len(n) <= 4 {
		return n
	}
	return strings.Repeat("*", len(n)-4) + n[len(n)-4:]
}
