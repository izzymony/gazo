package services

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// The signup bonus is guarded by the partial unique index from migration 013.
// When a concurrent call loses that race, CreditSignupBonus must treat it as
// success — but it must NOT swallow any other unique violation, which would
// hide a real failure on a money path.
func TestIsSignupBonusRaceLoss(t *testing.T) {
	const idx = "idx_credit_entries_one_signup_bonus_per_user"

	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"nil", nil, false},
		{
			// Shape Postgres actually produced, verified against the local DB.
			name: "typed pg unique violation on our index",
			err:  &pgconn.PgError{Code: "23505", ConstraintName: idx},
			want: true,
		},
		{
			name: "typed violation wrapped by gorm",
			err:  fmt.Errorf("create credit entry: %w", &pgconn.PgError{Code: "23505", ConstraintName: idx}),
			want: true,
		},
		{
			// Same index, but not a uniqueness failure — must not be swallowed.
			name: "different pg error code on our index",
			err:  &pgconn.PgError{Code: "42P01", ConstraintName: idx},
			want: false,
		},
		{
			// The critical negative: another unique violation elsewhere in the
			// transaction must surface as a real error.
			name: "unique violation on a DIFFERENT constraint",
			err:  &pgconn.PgError{Code: "23505", ConstraintName: "idx_products_public_id"},
			want: false,
		},
		{
			name: "untyped string form naming our index",
			err:  errors.New(`ERROR: duplicate key value violates unique constraint "` + idx + `"`),
			want: true,
		},
		{
			name: "untyped duplicate on another constraint",
			err:  errors.New(`ERROR: duplicate key value violates unique constraint "idx_business_tag_unique"`),
			want: false,
		},
		{"unrelated error", errors.New("connection refused"), false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isSignupBonusRaceLoss(tc.err); got != tc.want {
				t.Fatalf("isSignupBonusRaceLoss(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}
