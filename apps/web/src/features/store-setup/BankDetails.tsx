/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from "react";
import InputField from "@vibaar/ui/common/InputField";
import useBusinessStore from "@/store/businessStore";
import { DropButton } from "./StoreDetails";
import { Bank } from "@vibaar/ui/icons";
import Dialog from "@vibaar/ui/common/Dialog";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";

interface Props {
  data: {
    bank_name: string;
    account_number?: string;
    account_name?: string;
  };
  error: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setBanks: (val: string) => void;
}

// Bank selection modal (Dialog primitive) — auto-closes on selection.
// Dialog owns the backdrop, sheet/dialog responsiveness, keyboard-aware height,
// drag indicator, and a11y (Escape/focus-trap/scroll-lock) — was all hand-rolled.
const BankSelectorModal = ({
  isOpen,
  banks,
  selectedName,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  banks: { name: string; code: string }[];
  selectedName: string;
  onSelect: (bank: { name: string; code: string }) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");

  // Filter out undefined/malformed bank items and then search
  const safeBanks = banks.filter((bank) => bank && bank.name && bank.code);
  const filteredBanks = search
    ? safeBanks.filter((bank) =>
        bank.name.toLowerCase().includes(search.toLowerCase())
      )
    : safeBanks;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} ariaLabel="Select a bank">
      {/* Header */}
      <div className="w-full flex flex-col items-center space-y-4">
        <p className="text-foreground-primary text-body-lg font-medium">Select a bank</p>
        <InputField
          type="text"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search bank"
          showSearch={true}
        />
      </div>

      {/* Bank list — own scroll so the search header stays put */}
      <div className="overflow-y-scroll scrollbar-hide mt-4 max-h-[55vh]">
        {filteredBanks.map((bank) => (
          <button type="button"
            key={bank.code}
            onClick={() => {
              onSelect(bank);
              onClose();
            }}
            className={`text-left w-full flex items-center px-3 py-3 cursor-pointer rounded-field ${
              selectedName === bank.name
                ? "bg-brand/10 border border-brandDeep"
                : "hover:bg-surface-muted"
            }`}
          >
            {/* Bank icon */}
            <div className="w-8 h-8 rounded-full bg-success-surface flex items-center justify-center mr-3">
              <Bank size={16} className="text-success-foreground" />
            </div>
            <span className="text-body text-foreground-primary">{bank.name}</span>
          </button>
        ))}
      </div>
    </Dialog>
  );
};

const BankDetails = ({ data, handleInputChange, error, setBanks }: Props) => {
  const [show, setShow] = useState(false);
  const {
    banks,
    selectedBank,
    validateBank,
    fetchBanks,
    setBanks: setBanksStore,
  } = useBusinessStore();
  const [selectedBankName, setSelectedBankName] = useState("");
  const [bankCode, setBankCode] = useState("");

  // Fetch the bank directory on mount if not already loaded. P12: the dashboard home
  // used to prefetch all 3 pages (~300 banks) on every visit; now the form that
  // actually needs the directory loads it itself (all pages, early-stopping).
  useEffect(() => {
    if (!banks || banks.length === 0) {
      paginatedFetcher(fetchBanks, setBanksStore, null, 3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback(async () => {
    await validateBank({
      account_number: data.account_number ? data.account_number : "",
      bank_code: bankCode ? bankCode : "",
    });
  }, [bankCode, data, validateBank]);

  useEffect(() => {
    if (bankCode && data.account_number && data.account_number.length >= 10) {
      validate();
    }
  }, [bankCode, data.account_number, validate]);

  // Transform banks for the selector - filter out undefined/malformed items
  const bankList = (banks || [])
    .filter((b) => b && b.name && b.code)
    .map((b) => ({ name: b.name, code: b.code }));

  const handleBankSelect = (bank: { name: string; code: string }) => {
    setSelectedBankName(bank.name);
    setBankCode(bank.code);
    setBanks(bank.name);
  };

  return (
    <>
      <div className="space-y-4">
        <DropButton
          toogleDrop={() => setShow(!show)}
          text={selectedBankName || "Select bank"}
          icon={true}
        />
        <InputField
          type="text"
          name="account_number"
          value={data?.account_number}
          onChange={handleInputChange}
          placeholder="Account number"
          error={error?.account_number}
        />
        <InputField
          type="text"
          name="account_name"
          value={selectedBank.AccountName}
          onChange={handleInputChange}
          placeholder="Account name"
          error={error?.account_name}
          disabled={true}
        />
      </div>

      <BankSelectorModal
        isOpen={show}
        banks={bankList}
        selectedName={selectedBankName}
        onSelect={handleBankSelect}
        onClose={() => setShow(false)}
      />
    </>
  );
};

export default BankDetails;
