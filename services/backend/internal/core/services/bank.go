package services

import (
	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/core/external_service/payments"
)

type BankService struct {
	payments payments.Paystack
}

func NewBankService() *BankService {
	return &BankService{
		payments: payments.NewPaystackPaymentService(nil),
	}
}

func (b *BankService) GetBanks(page, limit int) (paginatedBanks []payments.Bank, totalPages int, err error) {
	return b.payments.GetBanks(page, limit)
}

func (b *BankService) SearchBank(query string, page int, limit int) ([]payments.Bank, int, error) {
	return b.payments.SearchBank(query, page, limit)
}

func (b *BankService) ValidateBankAccount(accountNumber, bankCode string) (*requests.AccountDetails, error) {
	return b.payments.ValidateBankAccount(accountNumber, bankCode)
}
