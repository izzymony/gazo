/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";

import H1 from "@vibaar/ui/common/Typography";
import InputField from "@vibaar/ui/common/InputField";
import EnhancedProductOptions from "../../EnhancedProductOptions";

interface Step3Props {
    formik: any; // Using any to match the parent component
}

const Step3ReadyToSell = ({ formik }: Step3Props) => {
    const [isVariableProduct, setIsVariableProduct] = useState(false);

    // Check if variants exist to determine if stock should be auto-calculated
    const hasVariants = formik.values?.variants && formik.values.variants.length > 0;
    const isStockAutoCalculated = isVariableProduct && hasVariants;

    // Auto-detect if product is variable based on existing variations
    useEffect(() => {
        if (hasVariants) {
            setIsVariableProduct(true);
        }
    }, [hasVariants]);

    return (
        <div className="flex-1 w-full">
            <div className="flex flex-col w-full flex-1">
                <H1 className="text-h1 text-start">
                    Ready to Sell!
                </H1>
                <p className="text-body mt-3 text-ink-40 text-start">
                    Almost there! Just a few final touches 🎯
                </p>

                {/* Inventory Stocks */}
                <div className="mt-6 mb-6">
                    <InputField
                        type="number"
                        name="inventoryStocks"
                        placeholder={isStockAutoCalculated ? "Total stock from variants" : "How many do you have in stock?"}
                        value={formik.values?.inventoryStocks || ""}
                        onChange={formik.handleChange}
                        disabled={isStockAutoCalculated}
                        error={formik.errors.inventoryStocks as string}
                    />
                    {isStockAutoCalculated && (
                        <div className="text-info-foreground text-body-sm mt-1">
                            ✓ Auto-calculated from {formik.values?.variations?.length || 0} variant combinations
                        </div>
                    )}

                </div>

                {/* Enhanced Product Options */}
                <EnhancedProductOptions
                    formik={formik}
                    isVariableProduct={isVariableProduct}
                    onToggleVariableProduct={setIsVariableProduct}
                    visibleSections={{}}
                    onToggleSection={() => {}}
                />

            </div>
        </div>
    );
};

export default Step3ReadyToSell;
