/**
 * Write actions must not resolve on failure.
 *
 * These all guard one bug shape: a store action catches, reports, and then
 * returns normally, so `await action()` succeeds even though nothing was
 * saved. Callers then announce success or navigate away — a product edit
 * showed "Product updated successfully!" next to the real error, and a failed
 * bank-account create still pushed to the payouts list.
 *
 * Two distinct failure shapes are covered, because fixing only the first
 * leaves the bug live:
 *   1. the request rejects (network error / non-2xx), and
 *   2. the request RESOLVES but the body says it failed.
 */

const mockClient = jest.fn();
const mockToast = { success: jest.fn(), error: jest.fn() };

jest.mock("@/lib/client", () => ({ Client: (...args: unknown[]) => mockClient(...args) }));
// Deferred: jest hoists these factories above the consts, so the mock must
// dereference mockToast at call time rather than at module-mock time.
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
  },
}));
jest.mock("js-cookie", () => ({ get: jest.fn(), set: jest.fn(), remove: jest.fn() }));

import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import useAuthStore from "@/store/authStore";

/** An axios-shaped rejection, as the real Client produces for a non-2xx. */
const axiosFailure = () =>
  Object.assign(new Error("Request failed with status code 400"), {
    isAxiosError: true,
    response: { status: 400, data: { error: "server said no" } },
  });

const ok = (data: unknown) => ({ status: 200, data });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("businessStore.updateStore", () => {
  const args = { name: "New name" } as never;

  it("runs the callback on success", async () => {
    mockClient.mockResolvedValueOnce(ok({ data: { id: "b1" } }));
    const callback = jest.fn();

    await useBusinessStore.getState().updateStore("b1", args, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does NOT run the callback when the save fails", async () => {
    // Regression: the callback sat in `finally`, so the store-address screen
    // called router.back() on a save that never landed.
    mockClient.mockRejectedValueOnce(axiosFailure());
    const callback = jest.fn();

    await useBusinessStore.getState().updateStore("b1", args, callback);

    expect(callback).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });
});

describe("businessStore.createBank", () => {
  const bank = { account_name: "A", account_number: "1", bank_code: "011" } as never;

  it("resolves when the account is created", async () => {
    mockClient.mockResolvedValueOnce(ok({ message: "Bank account added successfully" }));

    await expect(useBusinessStore.getState().createBank(bank)).resolves.toBeUndefined();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("rejects when the request fails", async () => {
    mockClient.mockRejectedValueOnce(axiosFailure());

    await expect(useBusinessStore.getState().createBank(bank)).rejects.toThrow();
    // Regression: this catch was silent, so a failed add told the user nothing.
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("rejects when the response resolves but reports an error", async () => {
    mockClient.mockResolvedValueOnce({ status: 200, data: { error: "invalid account" } });

    await expect(useBusinessStore.getState().createBank(bank)).rejects.toThrow();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("reports the failure exactly once", async () => {
    mockClient.mockResolvedValueOnce({ status: 200, data: { error: "invalid account" } });

    await expect(useBusinessStore.getState().createBank(bank)).rejects.toThrow();
    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });
});

describe("businessStore.createDiscount", () => {
  const coupon = { name: "SAVE10" } as never;

  it("resolves when the discount is created", async () => {
    mockClient.mockResolvedValueOnce(ok({ message: "successful" }));

    await expect(useBusinessStore.getState().createDiscount(coupon)).resolves.toBeUndefined();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("rejects when the request fails", async () => {
    mockClient.mockRejectedValueOnce(axiosFailure());

    await expect(useBusinessStore.getState().createDiscount(coupon)).rejects.toThrow();
  });

  it("rejects when the response resolves without a success message", async () => {
    // Regression: this branch toasted an error and then returned normally, so
    // the caller's router.back() discarded the whole filled-in form.
    mockClient.mockResolvedValueOnce(ok({ message: "something else" }));

    await expect(useBusinessStore.getState().createDiscount(coupon)).rejects.toThrow();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("reports the failure exactly once", async () => {
    mockClient.mockResolvedValueOnce(ok({ message: "something else" }));

    await expect(useBusinessStore.getState().createDiscount(coupon)).rejects.toThrow();
    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });
});

describe("productStore.verifyOtpSent", () => {
  const payload = {
    identifier: "a@b.com",
    otp: "123456",
    verification_type: "register_otp",
  } as never;

  it("resolves for an accepted code", async () => {
    mockClient.mockResolvedValueOnce(ok({ message: "successful" }));

    await expect(useProductStore.getState().verifyOtpSent(payload)).resolves.toBeUndefined();
  });

  it("rejects for a wrong code", async () => {
    // Regression: swallowing here made the withdrawal screen announce
    // "OTP verification successful!!!" on top of the error toast.
    mockClient.mockRejectedValueOnce(axiosFailure());

    await expect(useProductStore.getState().verifyOtpSent(payload)).rejects.toThrow();
  });
});

describe("authStore.updateShippingAddress", () => {
  const payload = { street: "1 Main St" };

  it("rejects when the update fails", async () => {
    // Regression: the edit page toasted success and router.replace'd away from
    // an unsaved edit, because this resolved on failure.
    mockClient.mockRejectedValueOnce(axiosFailure());

    await expect(
      useAuthStore.getState().updateShippingAddress("addr1", payload)
    ).rejects.toThrow();
  });

  it("leaves the success and error messages to the caller", async () => {
    mockClient.mockResolvedValueOnce(ok({ data: { message: "ok" } }));

    await useAuthStore.getState().updateShippingAddress("addr1", payload);

    // The only caller toasts both outcomes itself; toasting here too showed
    // the user two success messages for one save.
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
