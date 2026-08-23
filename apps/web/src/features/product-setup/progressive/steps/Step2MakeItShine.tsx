/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import H1 from "@vibaar/ui/common/Typography";
import InputField from "@vibaar/ui/common/InputField";
import CategorySelector from "@/features/store-setup/CategorySelector";
import CollectionComponent from "@/features/product-setup/manual/ProductCollection";

interface Step2Props {
    formik: any; // Using any to match the parent component
    selectedCategory: { categoryId: string; subCategoryId: string } | null;
    setSelectedCategory: (category: { categoryId: string; subCategoryId: string } | null) => void;
}

const Step2MakeItShine = ({
    formik,
    selectedCategory,
    setSelectedCategory
}: Step2Props) => {

    return (
        <>
            <div className="flex-1 w-full">
                <div className="flex flex-col w-full flex-1">
                    <H1 className="text-h1 text-start">
                        Make it Shine
                    </H1>
                    <p className="text-body mt-3 text-ink-40 text-start">
                        Looking great! Let's add the details that sell 📝
                    </p>

                    {/* Product Description */}
                    <div className="mt-6 mb-4">
                        <InputField
                            type="textarea"
                            name="description"
                            placeholder="Tell your story... What makes this product special?"
                            value={formik.values?.description || ""}
                            onChange={formik.handleChange}
                            className="h-[72px]"
                            error={formik.errors.description as string}
                        />

                    </div>

                    {/* Product Category */}
                    <div className="mb-4">
                        <CategorySelector
                            mode="product"
                            selectedCategory={
                                selectedCategory ? selectedCategory : undefined
                            }
                            onCategorySelect={(category) => {
                                if (typeof category === 'object') {
                                    console.log('🔍 Step2 - Category selected:', category);
                                    setSelectedCategory(category);
                                    // Also set in formik for validation and submission
                                    formik.setFieldValue('categoryId', category.categoryId);
                                    formik.setFieldValue('subCategoryId', category.subCategoryId);
                                    console.log('🔍 Step2 - Formik values after category set:', {
                                        categoryId: category.categoryId,
                                        subCategoryId: category.subCategoryId
                                    });
                                }
                            }}
                            error={formik.errors.categoryId as string || formik.errors.subCategoryId as string}
                        />
                    </div>

                    {/* Product Collections */}
                    <div className="mb-4">
                        <CollectionComponent formik={formik} />
                    </div>
                </div>
            </div>

        </>
    );
};

export default Step2MakeItShine;