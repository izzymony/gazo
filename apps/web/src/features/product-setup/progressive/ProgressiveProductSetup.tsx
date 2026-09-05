/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import Loader from "@vibaar/ui/common/Loader";
import useAuthStore from "@/store/authStore";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { categories as productCategories } from "@/lib/category";
import {
    trackProductCreateStart,
    trackProductStep,
    trackProductPublished,
    startTiming,
    endTiming
} from "@/lib/analytics";

// Step components
import Step1StartStrong from "./steps/Step1StartStrong";
import Step2MakeItShine from "./steps/Step2MakeItShine";
import Step3ReadyToSell from "./steps/Step3ReadyToSell";

// Types
interface ImageProps {
    base64: string;
    name: string;
    toggle: boolean;
}

interface Variation {
    option?: string;
    name?: string;
    values?: string[];
}

interface VariantDetail {
    combination?: string;
    price?: number | null;
    stock?: number | null;
}

// Validation schemas for each step
// Lazy-load the heavy full-screen preview (only rendered when previewing).
const ProductPreview = dynamic(
  () => import("@/features/product-setup/manual/Preview"),
  { ssr: false }
);

const validationSchemas = [
    // Step 1: Start Strong (Images, Title, Price)
    Yup.object({
        title: Yup.string().required("Product title is required"),
        price: Yup.number()
            .required("Price is required")
            .min(1, "Price must be at least ₦1")
            .max(10000000, "Price cannot exceed ₦10,000,000"),
        oldPrice: Yup.number()
            .min(0, "Old price cannot be negative")
            .max(10000000, "Old price cannot exceed ₦10,000,000")
            .test('price-relationship', function(value) {
                const { price } = this.parent;
                if (value && price && Number(value) <= Number(price)) {
                    return this.createError({
                        message: 'Old price must be higher than current price to show a discount'
                    });
                }
                return true;
            })
            .nullable(),
        images: Yup.array().min(1, "At least one product image is required"),
    }),
    // Step 2: Make it Shine (Description, Category, Collection)
    Yup.object({
        description: Yup.string().required("Product description is required"),
        categoryId: Yup.string().required("Category is required"),
        subCategoryId: Yup.string().required("Subcategory is required"),
    }),
    // Step 3: Ready to Sell (Inventory, Variations, Shipping)
    Yup.object({
        inventoryStocks: Yup.number().required("Inventory stock is required").min(1, "Must have at least 1 item"),
    }),
];

export default function ProgressiveProductSetup() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryStep = searchParams.get("step");

    const { user } = useAuthStore();
    const { store } = useBusinessStore();
    const { addProduct, setProductPreview, isLoading } = useProductStore();

    const [step, setStep] = useState<number>(1);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Category selection state
    const [selectedCategory, setSelectedCategory] = useState<{ categoryId: string; subCategoryId: string } | null>(null);

    useEffect(() => {
        if (queryStep) {
            setStep(Number(queryStep));
        }
    }, [queryStep]);

    // Track product creation start
    useEffect(() => {
        trackProductCreateStart('progressive_flow');
        startTiming('product_creation');
    }, []);

    async function handleNextStep() {
        // Log form values without images to avoid quota issues
        const { images, ...valuesWithoutImages } = formik.values;
        console.log("Form submitted with values:", {
            ...valuesWithoutImages,
            imageCount: images?.length || 0
        });
        const errors = await formik.validateForm();
        if (Object.keys(errors).length === 0) {
            // Track step completion
            const stepNames = ['images_title_price', 'description_category', 'inventory_shipping'];
            trackProductStep(step, stepNames[step - 1], {
                has_images: formik.values.images?.length > 0,
                image_count: formik.values.images?.length || 0,
            });

            if (step < 3) {
                router.push(`?step=${step + 1}`);
            } else if (step === 3) {
                // Go to preview
                handlePreview();
            }
        } else {
            console.log("Validation errors:", errors);

            // Mark all fields as touched to show validation errors
            const touchedFields: Record<string, boolean> = {};
            Object.keys(errors).forEach(key => {
                touchedFields[key] = true;
            });
            formik.setTouched(touchedFields);

            // Show toast error
            toast.error("Please fix the errors before continuing");
        }
    }

    const handlePreview = () => {
        setProductPreview({
            ...formik.values,
        } as unknown as import("@/lib/types").ProductData);
        setIsPreviewOpen(true);
    };

    const formik = useFormik({
        initialValues: {
            id: "",
            title: "",
            description: "",
            price: "",
            oldPrice: 0,
            collections: [] as string[],
            inventoryStocks: "",
            images: [] as ImageProps[],
            shipping: "self",
            variations: [] as Variation[],
            variantDetails: [] as VariantDetail[],
            variants: [] as any[],
            weight: "",
            size: "",
            selfShipping: true,
            instaShipping: true,
            categoryId: "",
            subCategoryId: "",
        },
        validationSchema: validationSchemas[step - 1],
        onSubmit: handleNextStep,
        validateOnChange: true,
        validateOnBlur: true,
    });

    useEffect(() => {
        // Draft loading disabled to prevent localStorage quota issues
        // Clear any existing draft that might cause problems
        try {
            localStorage.removeItem('productDraft');
        } catch (error) {
            console.warn('Could not clear product draft:', error);
        }
    }, []);

    // Disabled auto-save draft to prevent localStorage quota issues with images
    // The draft saving was causing QuotaExceededError when images are uploaded
    // useEffect(() => {
    //     // Auto-save logic removed to fix preview button
    // }, [formik.values]);

    const handlePublish = () => {
        console.log('🔍 Publishing with selectedCategory:', selectedCategory);
        console.log('🔍 Publishing with formik.values:', { 
            categoryId: formik.values.categoryId, 
            subCategoryId: formik.values.subCategoryId 
        });
        
        const categoryId = selectedCategory?.categoryId || formik.values.categoryId || "";
        const subCategoryId = selectedCategory?.subCategoryId || formik.values.subCategoryId || "";
        
        console.log('🔍 Final category values for API:', { 
          categoryId, 
          subCategoryId
        });
        
        // Use fallback values only if no category is selected
        const fallbackCategoryId = "9aebee99-0435-4ca1-bf82-7657bd35691a"; // Fashion category UUID
        const fallbackSubCategoryId = "f6e81ad4-d74f-45e0-a4f4-ba6ad0c91ce8"; // Men's Clothing subcategory UUID
        
        const finalCategoryId = categoryId || fallbackCategoryId;
        const finalSubCategoryId = subCategoryId || fallbackSubCategoryId;
        
        if (!categoryId && !subCategoryId) {
            console.warn('⚠️ No category selected, using fallback values');
            console.log('🔍 Using fallback category values:', { 
              finalCategoryId, 
              finalSubCategoryId 
            });
        }
        
        const payload = {
            sku: formik.values.id,
            barcode: "1234567",
            title: formik.values.title,
            description: formik.values.description,
            image: formik.values.images.length > 0
                ? formik.values.images.map((img) => img.base64)
                : null,
            stock: formik.values.inventoryStocks,
            tag: formik.values.collections,
            collection_ids: formik.values.collections,
            price: {
                old_price: Number(formik.values.oldPrice) || 0,
                price: Number(formik.values.price) || 0,
            },
            variants: (formik.values.variants?.length > 0 ? formik.values.variants : formik.values.variations || []).map((variation: Variation) => ({
                name: variation?.name || variation?.option || null,
                status: "show",
                types: variation.values || [],
            })),
            user_id: user?.id,
            business_id: store?.id,
            weight: 0.5,
            length: 10,
            width: 12,
            height: 6.9,
            size: formik.values.size,
            selfShipping: false,
            instaShipping: true,
            status: "active",
            is_combination: (formik.values.variants && formik.values.variants.length > 0) || formik.values.variantDetails.length > 0,
            category_id: finalCategoryId,
            sub_category_id: finalSubCategoryId,
            // variant_combinations removed - backend calculates combinations on-demand from variants
        };

        // Log payload without image data to avoid quota issues
        const { image, ...payloadWithoutImages } = payload;
        console.log('🔍 Complete payload being sent to API:', {
            ...payloadWithoutImages,
            imageCount: image?.length || 0
        });

        addProduct(payload as unknown as Parameters<typeof addProduct>[0], async () => {
            try {
                setIsRedirecting(true);

                // Track product published
                const creationDuration = endTiming('product_creation');
                trackProductPublished(
                    payload.sku || 'new',
                    payload.title,
                    Number(payload.price?.price) || 0,
                    finalCategoryId
                );
                if (creationDuration) {
                    console.log(`Product creation completed in ${creationDuration}s`);
                }

                // Clear draft on successful creation
                localStorage.removeItem('productDraft');
                
                // Force refresh business products to ensure new product appears immediately
                // fetchBusinessProduct refreshes the store internally
                const { fetchBusinessProduct } = useBusinessStore.getState();
                await fetchBusinessProduct(1);
                
                router.push(`/dashboard/storefront?status=new-product`);
            } catch (error) {
                console.error('Failed to refresh products after creation:', error);
                // Still navigate even if refresh fails
                router.push(`/dashboard/storefront?status=new-product`);
            }
        });
    };

    const getButtonText = () => {
        if (step === 3) return "Preview";
        return "Continue";
    };

    const discount = formik.values.oldPrice && formik.values.price
        ? ((+formik.values.oldPrice - +formik.values.price) / +formik.values.oldPrice) * 100
        : 0;

    if (isRedirecting) {
        return <Loader />;
    }

    if (isPreviewOpen) {
        return (
            <div className="bg-surface h-full w-full">
                <ProductPreview
                    publish={handlePublish}
                    setIsPreviewOpen={setIsPreviewOpen}
                    isLoading={isLoading}
                    discount={discount}
                />
            </div>
        );
    }

    return (
        <PageShell
            header={
                <Header
                    showBack
                    showStepNavigation
                    step={step}
                    totalSteps={3}
                    customText="Add Product"
                    onBackClick={() => {
                        if (step === 3) {
                            router.back();
                        } else if (step > 1) {
                            router.push(`?step=${step - 1}`);
                        } else {
                            router.back();
                        }
                    }}
                />
            }
            footerAction={
                <Button onClick={() => formik.handleSubmit()} loading={isLoading}>
                    {getButtonText()}
                </Button>
            }>
            <div className="flex flex-col w-full space-y-6 pt-4">
                {formik && step === 1 && <Step1StartStrong formik={formik} />}
                {formik && step === 2 && (
                    <Step2MakeItShine
                        formik={formik}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                    />
                )}
                {formik && step === 3 && <Step3ReadyToSell formik={formik} />}
            </div>
        </PageShell>
    );
}