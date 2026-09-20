-- Bank codes are strings, not numbers.
--
-- `bank_code` was `bigint`, and that silently destroyed data. Paystack bank
-- codes carry meaning in their leading characters:
--
--   * 52 of 284 NGN codes begin with a zero — Access 044, First Bank 011,
--     UBA 033, Zenith 057, GTBank 058. As integers these became 44, 11, 33,
--     57, 58.
--   * 10 are not numeric at all — 035A, MFB50094, MFB50992, FC40163, FC40128,
--     D53, MFB51093, MFB51116M. These could never be stored.
--
-- Measured against Paystack's API, not inferred: POST /transferrecipient with
-- bank_code "44" is refused with "Bank is invalid"; the same request with
-- "044" returns 201 and a recipient code. So while this column was an integer,
-- sellers banking with most of Nigeria's largest banks could not be paid at
-- all, and the failure surfaced as "check your bank details".
--
-- The conversion is VERBATIM. It does not guess at the zeros it is missing:
-- padding 33 to "033" happens to be right for UBA, and the same rule turns
-- MINT-FINEX MFB's real code "09" into "009", which is wrong. Recovering the
-- true code needs Paystack's bank list matched against the stored bank NAME,
-- which is not something a migration can do. That repair is
-- `make bank-codes-repair`, which reports every change before making it.
ALTER TABLE business_bank_account_details
  ALTER COLUMN bank_code TYPE text USING bank_code::text;

-- Rows whose code is now too short to be a real Paystack code. Left as-is on
-- purpose so the repair tool can find them; recipient creation fails loudly
-- for these until it runs.
DO $$
DECLARE suspect int;
BEGIN
  SELECT count(*) INTO suspect
  FROM business_bank_account_details
  WHERE bank_code IS NOT NULL AND bank_code <> '' AND length(bank_code) < 3;

  IF suspect > 0 THEN
    RAISE NOTICE 'bank_code: % row(s) look truncated by the old integer column. Run `make bank-codes-repair`.', suspect;
  END IF;
END $$;
