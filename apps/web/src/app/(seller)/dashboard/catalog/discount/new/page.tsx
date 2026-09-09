/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import RadioGroup from "@vibaar/ui/common/RadioGroup";
import Button from "@vibaar/ui/common/Button";
import Checkbox from "@vibaar/ui/common/Checkbox";
import InputField from "@vibaar/ui/common/InputField";
import { useFormik } from "formik";
import * as Yup from "yup";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Accordion from "@vibaar/ui/common/Accordion";
import Dialog from "@vibaar/ui/common/Dialog";
import { useRouter } from "next/navigation";
// import useAuthStore from "@/store/authStore";
import useBusinessStore, { CreateCoupon } from "@/store/businessStore";
import { formatCurrency } from "@/lib/utils";

function toISODate(dateStr: string): string {
  return `${dateStr}T00:00:00Z`;
}

function Page() {
  const router = useRouter();
  const [minimumRequirementOption, setMinimumRequirementOption] =
    useState("price");
  const [discountLimitOption, setDiscountLimitOption] = useState("total_usage");
  const { createDiscount } = useBusinessStore();
  // const { user } = useAuthStore();
  const { businessProduct } = useBusinessStore();
  const sellerProduct = businessProduct.filter((item) => item);
  //("sellerproduct ", sellerProduct, user);
  const [show, setShow] = useState(false);
  const [shows, setShows] = useState(false);
  const [search, setSearch] = useState("");
  const [sell, setSell] = useState(sellerProduct);

  useEffect(() => {
    if (search) {
      const searched = sellerProduct.filter((it) =>
        it.title?.toLowerCase().includes(search.toLowerCase())
      );
      setSell(searched);
    } else {
      setSell(sellerProduct);
    }
  }, [search]);

  const formik = useFormik({
    initialValues: {
      discountType: "",
      checkMinimum: true,
      checkDiscountLimit: true,
      productType: "Store Wide Products",
      discountTitle: "",
      code: "",
      discountValue: "Percentage",
      selectedProducts: [],
      percentageValue: "",
      fixedNairaValue: "",
      minimumRequiredType: "",
      discountLimit: "",
      minimumRequiredPrice: "",
      limitPerCustomer: "",
      startDate: "",
      endDate: "",
      storeWideDiscount: "",
      minimumOrderCount: "",
      totalUsageLimit: "",
      customerUsageLimit: "",
    },
    validationSchema: Yup.object({
      discountType: Yup.string().required("Required"),
      discountTitle: Yup.string().required("Required"),
      code: Yup.string().required("Required"),
      discountValue: Yup.number().required("Required"),
      minimumRequiredPrice: Yup.number().when("checkMinimum", {
        is: (checkMinimum: boolean) => checkMinimum === true,
        then: () => Yup.number().required("Required"),
      }),
      limitPerCustomer: Yup.number().when("checkDiscountLimit", {
        is: (checkDiscountLimit: boolean) => checkDiscountLimit === true,
        then: () => Yup.number().required("Required"),
      }),
      startDate: Yup.date().required("Required"),
      endDate: Yup.date().required("Required"),
    }),
    onSubmit: async () => {
      //("started.., ", formik.values);
      const couponData: CreateCoupon = {
        type: formik.values.discountType,
        title: formik.values.discountTitle,
        code: formik.values.code,
        discount_type: formik.values.discountValue,
        amount: +formik.values.percentageValue,
        apply_to: "products",
        product_ids:
          formik.values.productType === "Store Wide Products"
            ? sellerProduct.map((it) => it.id)
            : (formik.values.selectedProducts as any[]),
        min_requirement: {
          enabled: formik.values.checkMinimum,
          type: minimumRequirementOption,
          threshold: +formik.values.minimumRequiredPrice,
        },
        limit: {
          enabled: formik.values.checkDiscountLimit,
          type: discountLimitOption,
          limit_value: +formik.values.customerUsageLimit,
        },
        valid_from: toISODate(formik.values.startDate),
        valid_to: toISODate(formik.values.endDate),
      };
      await createDiscount(couponData);
      router.back();
    },
  });

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Create Discount"
        />
      }
      footerAction={
        <Button type="button" onClick={() => formik.handleSubmit()}>
          Add Discount
        </Button>
      }>
      <form
        onSubmit={formik.handleSubmit}
        className="w-full flex flex-col space-y-6">
        <Accordion title="Discount Details" initiallyOpen={true}>
          {/* Discount Details */}
          <div className="flex flex-col gap-3 mt-2 text-body-sm font-medium">
            <InputField
              name="discountType"
              placeholder="Discount Type"
              options={[
                { value: "Coupon code", label: "Coupon code" },
                { value: "buy_x_get_y", label: "Buy X get Y free" },
              ]}
              value={formik.values.discountType}
              onChange={() => {}}
              type="drop"
              error={formik.errors.discountType}
              drops={true}
              icon={true}
              dropAction={() => setShows(true)}
            />

            <InputField
              name="discountTitle"
              placeholder="Discount Title"
              value={formik.values.discountTitle}
              onChange={formik.handleChange}
              type="text"
              error={formik.errors.discountTitle}
            />

            {formik.values.discountType === "Coupon code" && (
              <InputField
                name="code"
                placeholder="Code"
                value={formik.values.code}
                onChange={formik.handleChange}
                type="text"
                error={formik.errors.code}
              />
            )}
          </div>
        </Accordion>

        {/* Discount Value */}
        <Accordion title="Discount Value" initiallyOpen={true}>
          <div className="flex flex-col gap-2 text-body-sm font-medium">
            <RadioGroup
              options={[
                { label: "Percentage %", value: "Percentage" },
                { label: "Fixed ", value: "Fixed" },
              ]}
              className="border border-outline rounded-field p-2"
              name="discountValue"
              selectedValue={formik.values.discountValue}
              onChange={(value: string) =>
                formik.setFieldValue("discountValue", value)
              }
            />
            <InputField
              name="percentageValue"
              value={formik.values.percentageValue}
              placeholder="Amount"
              onChange={formik.handleChange}
              type="number"
              error={formik.errors.code}
              showPercentage={formik.values.discountValue === "Percentage"}
              showNairaSymbol={
                formik.values.discountValue === "Fixed" ? true : false
              }
            />
          </div>
        </Accordion>

        {/* apply discount to */}

        <Accordion title="Apply Discount To " initiallyOpen={true}>
          <div className="flex flex-col gap-2 text-body-sm font-medium">
            <RadioGroup
              options={[
                { label: "Store Wide Products", value: "Store Wide Products" },
                { label: "Selected Products", value: "Selected Products" },
              ]}
              className="border border-outline rounded-field p-2"
              name="productType"
              selectedValue={formik.values.productType}
              onChange={(value: string) =>
                formik.setFieldValue("productType", value)
              }
            />
            {formik.values.productType === "Selected Products" && (
              <div className="flex flex-col gap-2">
                <InputField
                  name="selectedProducts"
                  placeholder="Select products"
                  value={
                    formik.values.selectedProducts.length > 0
                      ? `${formik.values.selectedProducts.length} items selected`
                      : ""
                  }
                  onChange={() => {}}
                  type="drop"
                  icon={true}
                  dropAction={() => setShow(true)}
                  drops={true}
                  //   error={formik.errors.selectedProducts}
                  showProductIcon={formik.values.discountValue === "Percentage"}
                  showNairaSymbol={
                    formik.values.discountValue === "storeWideDiscount"
                  }
                />
              </div>
            )}
          </div>
        </Accordion>

        {formik.values.selectedProducts.length > 0 &&
          formik.values.productType === "Selected Products" && (
            <Accordion title="Select Products" initiallyOpen={true}>
              {/* Discount Details */}
              {formik.values.selectedProducts.map((it: any) => {
                const label =
                  sellerProduct.find((its) => its.id === it)?.title + "";
                return (
                  <div key={it} className="flex flex-col gap-2">
                    <InputField
                      name="selectedProducts"
                      placeholder="Select products"
                      value={label}
                      onChange={() => {}}
                      type="drop"
                      icon={true}
                      dropAction={() => setShow(true)}
                      drops={true}
                      //   error={formik.errors.selectedProducts}
                      showProductIcon={
                        formik.values.discountValue === "Percentage"
                      }
                      showNairaSymbol={
                        formik.values.discountValue === "storeWideDiscount"
                      }
                    />
                  </div>
                );
              })}
            </Accordion>
          )}

        <Accordion title="Requirements & Limits " initiallyOpen={true}>
          <div className="flex flex-col gap-3 text-body-sm">
            <Checkbox
              label="Set minimum requirements"
              onChange={() =>
                formik.setFieldValue(
                  "checkMinimum",
                  !formik.values.checkMinimum
                )
              }
              checked={formik.values.checkMinimum}
            />

            {formik.values.checkMinimum && (
              <div className="flex flex-col gap-2 text-body-sm font-medium">
                <RadioGroup
                  options={[
                    { value: "price", label: "Price" },
                    { value: "order_count", label: "Order Count" },
                  ]}
                  className="border border-outline rounded-field p-2"
                  name="discountValue"
                  selectedValue={minimumRequirementOption}
                  onChange={(value: string) =>
                    setMinimumRequirementOption(value)
                  }
                />

                {minimumRequirementOption === "price" && (
                  <InputField
                    name="minimumRequiredPrice"
                    placeholder="Minimum Required Price"
                    type="text"
                    value={formik.values.minimumRequiredPrice}
                    onChange={formik.handleChange}
                    error={formik.errors.minimumRequiredPrice}
                  />
                )}

                {minimumRequirementOption === "order_count" && (
                  <InputField
                    name="minimumOrderCount"
                    placeholder="Minimum Order Count"
                    type="number"
                    value={formik.values.minimumOrderCount}
                    onChange={formik.handleChange}
                    error={formik.errors.minimumOrderCount}
                  />
                )}
              </div>
            )}

            <Checkbox
              label="Set discount limit"
              onChange={() =>
                formik.setFieldValue(
                  "checkDiscountLimit",
                  !formik.values.checkDiscountLimit
                )
              }
              checked={formik.values.checkDiscountLimit}
            />

            {formik.values.checkDiscountLimit && (
              <div className="flex flex-col gap-2 text-body-sm font-medium">
                <RadioGroup
                  options={[
                    { label: "Total Usage", value: "total_usage" },
                    { value: "customer_usage", label: "Customer Usage" },
                  ]}
                  className="border border-outline rounded-field p-2"
                  name="discountLimit"
                  selectedValue={discountLimitOption}
                  onChange={(value: string) => setDiscountLimitOption(value)}
                />

                {discountLimitOption === "total_usage" && (
                  <InputField
                    name="totalUsageLimit"
                    placeholder="Enter total usage limit"
                    type="text"
                    value={formik.values.totalUsageLimit}
                    onChange={formik.handleChange}
                    error={formik.errors.totalUsageLimit}
                  />
                )}

                {discountLimitOption === "customer_usage" && (
                  <InputField
                    name="customerUsageLimit"
                    placeholder="Enter limit per customer"
                    type="text"
                    value={formik.values.customerUsageLimit}
                    onChange={formik.handleChange}
                    error={formik.errors.customerUsageLimit}
                  />
                )}
              </div>
            )}
          </div>
        </Accordion>

        <Dialog
          isOpen={show}
          onClose={() => setShow(false)}
          ariaLabel="Select a product">
          <div className="flex flex-col space-y-4">
            <p className="text-foreground-primary text-body font-medium text-center">
              Select a product
            </p>
            <InputField
              type="text"
              name="search"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder={`Select`}
              showSearch={true}
            />
            <div className="max-h-[438px] overflow-y-scroll scrollbar-hide">
              {sell.map((it) => (
                  <button type="button"
                    onClick={() => {
                      const value = it.id;
                      formik.setFieldValue("selectedProducts", [
                        ...formik.values.selectedProducts,
                        value,
                      ]);
                      setShow(false);
                    }}
                    key={it.id}
                    className="text-left w-full mb-2 flex gap-4 ">
                    <div key={it.id} className="w-full flex-1 flex gap-4 ">
                      <img
                        src={it?.image?.[0] || ""}
                        alt="kd"
                        className="w-10 h-10 rounded-field object-cover"
                      />
                      <div className="text-body-sm">
                        <p className="text-foreground-primary font-medium">{it.title}</p>
                        <p className="text-foreground-secondary">
                          Stock:{it.stock} Variant:{it.weight}
                        </p>
                      </div>
                    </div>
                    <p className="text-body font-medium text-foreground-primary">
                      {formatCurrency(it?.price ? +it.price : 0)}
                    </p>
                  </button>
                ))}
              </div>
          </div>
        </Dialog>
        <Dialog
          isOpen={shows}
          onClose={() => setShows(false)}
          ariaLabel="Select a discount type">
          <div className="flex flex-col space-y-4">
            <p className="text-foreground-primary text-body font-medium text-center">
              Select a discount type
            </p>
            <div className="max-h-[438px] overflow-y-scroll scrollbar-hide">
              {["Coupon code", "buy_x_get_y"].map((it) => (
                <div
                  onClick={() => {
                    formik.setFieldValue("discountType", it);
                    setShows(false);
                  }}
                  key={it}
                  className="w-full mb-4 flex gap-4 ">
                  <p className="text-body font-medium text-foreground-primary">{it}</p>
                </div>
              ))}
            </div>
          </div>
        </Dialog>

        {/* Validity */}
        <Accordion title="Validity" initiallyOpen={true}>
          <div className="flex flex-col gap-4">
            <InputField
              name="startDate"
              placeholder="Start date"
              type="date"
              value={formik.values.startDate}
              onChange={formik.handleChange}
              error={formik.errors.startDate}
            />
            <InputField
              name="endDate"
              placeholder="End date"
              type="date"
              value={formik.values.endDate}
              onChange={formik.handleChange}
              error={formik.errors.endDate}
            />
          </div>
        </Accordion>

      </form>
    </PageShell>
  );
}

export default Page;
