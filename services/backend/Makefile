.PHONY: all tidy

all: tidy
	go run .

tidy:
	go mod tidy

# Answers "can this account actually send a transfer?" before payouts are
# enabled. Read-only: it lists and reads, and initiates nothing. Loads .env so
# it checks the same credentials the server would use.
.PHONY: paystack-preflight
paystack-preflight:
	@set -a; [ -f .env ] && . ./.env; set +a; go run ./cmd/paystack-preflight

# Reports payout bank codes that the old integer column truncated, by matching
# the stored bank NAME against Paystack's live list. Changes nothing.
.PHONY: bank-codes-audit
bank-codes-audit:
	@set -a; [ -f .env ] && . ./.env; set +a; go run ./cmd/bank-codes

# Applies the unambiguous fixes and clears the stale Paystack recipient codes
# that were built from the wrong bank.
.PHONY: bank-codes-repair
bank-codes-repair:
	@set -a; [ -f .env ] && . ./.env; set +a; go run ./cmd/bank-codes -repair
