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
