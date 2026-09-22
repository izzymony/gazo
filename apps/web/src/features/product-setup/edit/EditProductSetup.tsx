/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BiChevronDown, BiChevronUp, BsThreeDots, X, Plus, CircleCheck } from "@vibaar/ui/icons";
import Image from "next/image";
import { toast } from "sonner";
import { isTaxonomyId } from "@/hooks/useCategories";
import { useProductImagePreparation } from "@/features/product-setup/lib/useProductImagePreparation";
import {
    ProductImagePreparationProvider,
    useIsPreparingProductImages,
} from "@/features/product-setup/lib/ProductImagePreparation";

import PageShell from "@vibaar/ui/PageShell";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import Loader from "@vibaar/ui/common/Loader";
import DisclosureButton from "@vibaar/ui/common/DisclosureButton";
import Switch from "@vibaar/ui/common/Switch";
import useAuthStore from "@/store/authStore";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import CategorySelector from "@/features/store-setup/CategorySelector";
import CollectionComponent from "@/features/product-setup/manual/ProductCollection";
import InputField from "@vibaar/ui/common/InputField";
import EnhancedProductOptions from "@/features/product-setup/EnhancedProductOptions";
import { handleAxiosError } from "@/lib/utils";

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
    ownedProperties?: string[];
    priceValues?: Record<string, number>;
    stockValues?: Record<string, number>;
    imageValues?: Record<string, string>;
}

interface VariantDetail {
    combination?: string;
    price?: number | null;
    stock?: number | null;
    name?: string;
    values?: string[];
    ownedProperties?: string[];
    priceValues?: Record<string, number>;
    stockValues?: Record<string, number>;
    imageValues?: Record<string, string>;
}

interface EditProductSetupProps {
    productId: string;
}

// Helper function to reconstruct variations from variant_combinations
const reconstructVariationsFromCombinations = (combinations: any[]): Variation[] => {
    const variationMap = new Map<string, Set<string>>();


    combinations.forEach((combo) => {
        if (combo.combination_key) {

            // Handle both formats: "White-Small" (hyphen) and "Black / L / Cotton" (slash with spaces)
            let parts: string[] = [];
            if (combo.combination_key.includes(' / ')) {
                // Split by " / " for format like "Black / L / Cotton"
                parts = combo.combination_key.split(' / ');
            } else if (combo.combination_key.includes('-')) {
                // Split by "-" for format like "White-Small"
                parts = combo.combination_key.split('-');
            } else {
                // Single value, treat as first variation
                parts = [combo.combination_key];
            }


            parts.forEach((value, index) => {
                const trimmedValue = value.trim();
                if (trimmedValue) {
                    // Use descriptive names based on common e-commerce patterns
                    const variationKey = index === 0 ? 'Color' :
                                       index === 1 ? 'Size' :
                                       index === 2 ? 'Material' :
                                       `Option ${index + 1}`;

                    if (!variationMap.has(variationKey)) {
                        variationMap.set(variationKey, new Set());
                    }
                    variationMap.get(variationKey)!.add(trimmedValue);
                }
            });
        }
    });

    // Convert map to Variation array
    const reconstructedVariations: Variation[] = Array.from(variationMap.entries()).map(([name, valuesSet]) => ({
        option: name.toLowerCase(),
        name,
        values: Array.from(valuesSet).sort()
    }));

    return reconstructedVariations;
};

// Validation schema for all fields
const validationSchema = Yup.object({
    title: Yup.string().required("Product title is required"),
    price: Yup.number()
        .required("Price is required")
        .min(1, "Price must be at least ₦1")
        .max(10000000, "Price cannot exceed ₦10,000,000"),
    comparePrice: Yup.number()
        .min(0, "Compare price cannot be negative")
        .max(10000000, "Compare price cannot exceed ₦10,000,000")
        .test('price-relationship', function(value) {
            const { price } = this.parent;
            if (value && price && Number(value) <= Number(price)) {
                return this.createError({
                    message: 'Compare price must be higher than current price to show a discount'
                });
            }
            return true;
        })
        .nullable(),
    images: Yup.array().min(1, "At least one product image is required"),
    description: Yup.string().required("Product description is required"),
    category: Yup.mixed().test('category-check', 'Product category is required', function (value) {
        // Accept either string or object with category properties
        if (typeof value === 'string' && value.length > 0) return true;
        if (typeof value === 'object' && value !== null) {
            const cat = value as { name?: string; id?: string; external_category_id?: string };
            return Boolean(cat.name || cat.id || cat.external_category_id);
        }
        return false;
    }),
    stock: Yup.number().min(0, "Stock must be positive"),
});

export default function EditProductSetup({ productId }: EditProductSetupProps) {
    // Every product image picker below reports here, so Update can wait for
    // preparation happening in the variants editor as well as in this gallery.
    return (
        <ProductImagePreparationProvider>
            <EditProductSetupInner productId={productId} />
        </ProductImagePreparationProvider>
    );
}

function EditProductSetupInner({ productId }: EditProductSetupProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const { store } = useBusinessStore();
    const { getProductByIds, updateProduct, setProduct, isLoading } = useProductStore();

    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const { prepare } = useProductImagePreparation();
    // Includes variant-image pickers deep in the variants editor, not just this
    // screen's own gallery.
    const preparingImages = useIsPreparingProductImages();
    // Submit handlers close over the render they were created in; a ref is what
    // makes the guard see the current value rather than a stale `false`.
    const preparingRef = useRef(preparingImages);
    preparingRef.current = preparingImages;
    const [productData, setProductData] = useState<any>(null);
    const [images, setImages] = useState<ImageProps[]>([]);
    const [variations, setVariations] = useState<Variation[]>([{ option: "size", name: "Size", values: [] }]);
    const [variantDetails, setVariantDetails] = useState<VariantDetail[]>([]);
    const [isVariable, setIsVariable] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<{ categoryId: string; subCategoryId: string } | null>(null);
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        details: true,
        inventory: true
    });

    // State for horizontal scroll image management
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const toggleSection = (section: 'basic' | 'details' | 'inventory') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // NEWLY PICKED photos only. Images already on the product arrive as
    // Cloudinary URLs in the same `{base64}` slot and are never touched here —
    // this handler only ever sees a `File`, so a stored URL cannot be decoded,
    // re-encoded, or inflated into a data URL on the next save.
    const handleAddImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !formik?.values) return;

        const prepared = await prepare(files);
        event.target.value = "";
        if (!prepared || prepared.length === 0) return;

        // Merge against the LATEST value, not one captured before the await.
        // Preparation takes 1-3s, and a gallery read before it and written after
        // it silently resurrects an image deleted in between, or undoes a
        // reorder. `setValues` takes an updater; `setFieldValue` does not.
        formik.setValues((prev: typeof formik.values) => {
            const existing = prev.images || [];
            return {
                ...prev,
                images: [
                    ...existing,
                    ...prepared.map((image, index) => ({
                        base64: image.dataUrl,
                        name: `image${existing.length + index + 1}`,
                        toggle: true,
                    })),
                ],
            };
        });
    };

    const handleDeleteImage = (index: number) => {
        if (formik?.values?.images) {
            const updatedImages = formik.values.images.filter((_: ImageProps, i: number) => i !== index);
            formik.setFieldValue("images", updatedImages);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (event: React.DragEvent, index: number) => {
        event.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && formik?.values?.images) {
            const updatedImages = [...formik.values.images];
            const draggedItem = updatedImages[draggedIndex];
            // Remove dragged item
            updatedImages.splice(draggedIndex, 1);
            // Insert at new position
            updatedImages.splice(dragOverIndex, 0, draggedItem);
            formik.setFieldValue("images", updatedImages);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleImageToggleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        if (formik?.values?.images) {
            const { checked } = e.target;
            const updatedImages = [...formik.values.images];
            if (updatedImages[index]) {
                updatedImages[index].toggle = checked;
                formik.setFieldValue("images", updatedImages);
            }
        }
    };

    // Initialize formik with empty values - will be updated when product loads
    const formik = useFormik({
        initialValues: {
            title: "",
            description: "",
            category: "",
            categoryId: "",
            subCategoryId: "",
            collection: "",
            price: 0,
            stock: 0,
            comparePrice: 0,
            weight: 0,
            brand: "",
            tags: [] as string[],
            images: [] as ImageProps[],
            variations: [] as Variation[],
            variants: [] as VariantDetail[],
            isVariable: false,
        },
        validationSchema,
        onSubmit: async (values) => {
            // The form is `onSubmit={formik.handleSubmit}`, so Enter in any field
            // submits it — the disabled Update button never covered that path.
            // Submitting mid-preparation would save the product WITHOUT the photo
            // the seller just chose, silently.
            if (preparingRef.current) {
                toast.error("Still preparing your image. Try again in a moment.");
                return;
            }

            if (!productId) {
                console.error("No product ID provided");
                return;
            }

            try {
                // Extract category string from either string or object
                let categoryName = values.category;
                if (typeof values.category === 'object' && values.category !== null) {
                    const cat = values.category as { name?: string; description?: string };
                    categoryName = cat.name || cat.description || 'Electronics';
                }

                // Same contract as create: a real taxonomy id or no request at all.
                const categoryIdForUpdate = selectedCategory?.categoryId || values.categoryId || "";
                const subCategoryIdForUpdate = selectedCategory?.subCategoryId || values.subCategoryId || "";
                if (!isTaxonomyId(categoryIdForUpdate) || !isTaxonomyId(subCategoryIdForUpdate)) {
                    toast.error("Choose a product category before updating.");
                    return;
                }

                // Convert to backend expected format - ensure all required fields are present and valid
                const productPayload = {
                    title: values.title || "Untitled Product",
                    description: values.description || "",
                    slug: (values.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    category_id: categoryIdForUpdate,
                    sub_category_id: subCategoryIdForUpdate,
                    // Simplify image handling - only include valid base64 strings
                    image: (() => {
                        const imageArray = values.images && values.images.length > 0
                            ? values.images.filter(img => img && (img.base64 || typeof img === 'string')).map(img => img.base64 || img)
                            : images.filter(img => img && (img.base64 || typeof img === 'string')).map(img => img.base64 || img);
                        return imageArray.length > 0 ? imageArray : [];
                    })(),
                    stock: Math.max(0, Number(values.stock) || 0),
                    weight: Math.max(0, Number(values.weight) || 0),
                    tag: Array.isArray(values.tags) ? values.tags.filter(tag => tag && tag.trim()) : [],
                    price: {
                        price: Math.max(0, Number(values.price) || 0),
                        old_price: Math.max(0, Number(values.comparePrice) || 0)
                    },
                    variants: isVariable && Array.isArray(values.variants) ? values.variants.map(v => ({
                        name: String(v.name || ''),
                        status: "show",
                        types: Array.isArray(v.values) ? v.values.filter(val => val && val.trim()) : [],
                        // Include custom properties if they exist
                        owned_properties: Array.isArray(v.ownedProperties) ? v.ownedProperties : [],
                        price_values: v.priceValues || {},
                        stock_values: v.stockValues || {},
                        image_values: v.imageValues || {}
                    })) : [],
                    is_combination: Boolean(isVariable),
                    status: "active",
                    collection_ids: Array.isArray(values.tags) ? values.tags : [],
                    // variant_combinations removed - backend calculates combinations on-demand from variants
                };


                // The updateProduct now automatically handles state synchronization
                let updatedProduct;
                // The fallback below re-READS the product; a successful read says
                // nothing about whether the WRITE landed. Without this flag the
                // catch fell through to toast.success, so a failed save was
                // announced as "Product updated successfully!" next to the real
                // error toast the store had already raised.
                let updateSucceeded = false;
                try {
                    updatedProduct = await updateProduct(productId, productPayload as unknown as Parameters<typeof updateProduct>[1]);
                    updateSucceeded = true;
                } catch (updateError) {
                    console.warn('⚠️ Store update failed, trying fallback refresh...', updateError);

                    // Fallback: re-sync local state to what the server actually
                    // holds. Recovery only — it must not mark the write verified.
                    try {
                        updatedProduct = await getProductByIds(productId);
                        if (updatedProduct) {
                            setProduct(updatedProduct); // Manual store sync
                        }
                    } catch (fallbackError) {
                        console.error('❌ Both update and fallback failed:', fallbackError);
                        throw updateError; // Throw original error
                    }
                }

                // Update local component state with the returned data
                if (updatedProduct) {
                    setProductData(updatedProduct);
                } else {
                    console.error('❌ No product data received after update');
                }

                // Only on a confirmed write. The store already raised the error
                // toast (handleAxiosError) before re-throwing, so a failure is
                // reported exactly once and this stays silent.
                if (updateSucceeded) {
                    toast.success('Product updated successfully!');
                }
            } catch (error) {
                console.error("❌ Error updating product:", error);
                // Stay on page so user can fix the issue and try again
                handleAxiosError(error);
            }
        },
    });

    // Fetch product data on mount
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setIsLoadingProduct(true);

                // A failed fetch used to be answered with a hardcoded mock product
                // — title "Local Image", price 1333, a picsum photo, and two
                // category uuids that no longer exist in the database. The seller
                // was then editing a fabrication of someone else's test data over
                // the top of their real product, and Update would have written it
                // back. Fail loudly and leave the product alone.
                const product = await getProductByIds(productId);

                setProductData(product);

                // Convert product images to expected format
                const productImages = (product.image || product.images || []).map((url: string, index: number) => ({
                    base64: url,
                    name: `image-${index + 1}`,
                    toggle: true,
                })) || [];

                setImages(productImages);

                // Determine if product is variable based on is_combination flag from backend
                // Only use is_combination as the source of truth to prevent stale data issues
                const isProductVariable = Boolean(product.is_combination);
                setIsVariable(isProductVariable);

                // Priority: Use variants (with custom properties) > variations > reconstruct from combinations
                let finalVariations = [];

                if (product.variants && product.variants.length > 0) {
                    finalVariations = product.variants.map((variant: any) => ({
                        option: variant.name?.toLowerCase() || 'variant',
                        name: variant.name || 'Variant',
                        values: Array.isArray(variant.types) ? variant.types : [],
                        // Load custom properties from backend
                        ownedProperties: Array.isArray(variant.owned_properties) ? variant.owned_properties : [],
                        priceValues: variant.price_values || {},
                        stockValues: variant.stock_values || {},
                        imageValues: variant.image_values || {}
                    }));
                } else if (product.variations && product.variations.length > 0) {
                    finalVariations = product.variations;
                } else if (product.variant_combinations && product.variant_combinations.length > 0) {
                    finalVariations = reconstructVariationsFromCombinations(product.variant_combinations);
                }

                setVariations(finalVariations.length > 0 ? finalVariations : [{ option: "size", name: "Size", values: [] }]);

                // Load existing variant combinations with stock data
                if (product.variant_combinations && product.variant_combinations.length > 0) {
                    const existingVariantDetails = product.variant_combinations.map((combo: any) => ({
                        combination: combo.combination_key,
                        price: combo.price,
                        stock: combo.stock || 0
                    }));
                    setVariantDetails(existingVariantDetails);
                } else {
                    setVariantDetails(product.variants || []);
                }

                // Set category if available
                if (product.category_id && product.sub_category_id) {
                    const categoryData = {
                        categoryId: product.category_id,
                        subCategoryId: product.sub_category_id
                    };
                    setSelectedCategory(categoryData);

                    // Also update formik immediately 
                    setTimeout(() => {
                        formik.setFieldValue('category', product.category || 'Fashion');
                        formik.setFieldValue('categoryId', product.category_id);
                        formik.setFieldValue('subCategoryId', product.sub_category_id);
                    }, 100);
                } else {
                }

                // Update formik values - ensure category is a string
                const categoryValue = typeof product.category === 'object'
                    ? (product.category.name || product.category.description || "Electronics")
                    : (product.category || "Electronics");

                // Debug price structure

                // Handle price structure - backend might return nested price object
                let currentPrice = 0;
                let comparePrice = 0;

                if (typeof product.price === 'object' && product.price !== null) {
                    currentPrice = product.price.price || 0;
                    comparePrice = product.price.old_price || 0;
                } else {
                    currentPrice = product.price || 0;
                    // Fix: Backend stores as 'old_price', not 'compare_price'
                    comparePrice = product.old_price || product.compare_price || product.original_price || 0;
                }

                // CRITICAL FIX: Transform backend variants to frontend format
                // Backend returns {name, types} but frontend expects {name, values}
                const formikVariants = finalVariations.map((v: Variation) => ({
                    name: v.name || '',
                    values: v.values || [], // Use 'values' not 'types' for frontend
                    ownedProperties: v.ownedProperties || [],
                    priceValues: v.priceValues || {},
                    stockValues: v.stockValues || {},
                    imageValues: v.imageValues || {}
                }));


                // Backend returns 'tag' field (not 'tags')
                const productTags = Array.isArray(product.tag) ? product.tag : [];


                formik.setValues({
                    title: product.title || "",
                    description: product.description || "",
                    category: categoryValue, // Ensure this is always a string
                    categoryId: product.category_id || "",
                    subCategoryId: product.sub_category_id || "",
                    collection: product.collection || "",
                    price: currentPrice,
                    stock: product.stock || 0,
                    comparePrice: comparePrice,
                    weight: product.weight || 0,
                    brand: product.brand || "",
                    tags: productTags,
                    images: productImages,
                    variations: finalVariations,
                    variants: formikVariants, // Use transformed variants with 'values' field
                    isVariable: isProductVariable,
                });
            } catch (error) {
                // Previously this only logged, and the mock fallback above meant the
                // form still rendered — seeded with fabricated data. With the mock
                // gone, an unhandled failure would render an EMPTY form that Update
                // would happily write over the real product. Leave instead.
                console.error("Error fetching product:", error);
                toast.error("Couldn't load that product. Try again.");
                router.back();
            } finally {
                setIsLoadingProduct(false);
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    // CRITICAL FIX: Sync variations state with formik.values.variants
    // This ensures templates and manual edits update the formik state that gets sent to backend
    useEffect(() => {
        // Skip sync during initial load to prevent infinite loops
        if (!isLoadingProduct && variations && variations.length > 0) {
            // Check if variations have actual values (not just empty structure)
            const hasActualValues = variations.some(v => v.values && v.values.length > 0);

            if (hasActualValues) {
                // Transform variations to formik format with 'values' field
                const formikVariants = variations.map(v => ({
                    name: v.name || '',
                    values: v.values || [], // Frontend expects 'values' not 'types'
                    ownedProperties: v.ownedProperties || [],
                    priceValues: v.priceValues || {},
                    stockValues: v.stockValues || {},
                    imageValues: v.imageValues || {}
                }));

                // Only update if actually different to avoid unnecessary re-renders
                const currentVariants = formik.values.variants;
                const hasChanged = JSON.stringify(currentVariants) !== JSON.stringify(formikVariants);

                if (hasChanged) {
                    formik.setFieldValue('variants', formikVariants);
                }
            }
        }
    }, [variations, isLoadingProduct]); // Re-sync whenever variations change

    if (isLoadingProduct) {
        return <Loader />;
    }

    return (
        <PageShell
            contentClassName="px-0"
            pageHeader={{
                onBack: () => router.back(),
                title: "Edit Product",
                // The group keeps its own flex row at lg rather than dissolving
                // into the band's action cell with `lg:contents`. Measured
                // reason: the cell is `items-center`, and `bordered` is 2px
                // taller than `filled` (its border is outside the padding box),
                // so the two buttons rendered 46px and 44px with mismatched
                // baselines. Its own row stretches them to a common 46px, which
                // is also exactly what mobile has always done.
                actions: (
                    <div className="flex gap-3">
                        <PageActionButton
                            kind="secondary"
                            onClick={() => router.back()}
                            className="flex-1 mt-0 lg:flex-none">
                            Cancel
                        </PageActionButton>
                        <PageActionButton
                            onClick={() => {
                                if (Object.keys(formik.errors).length > 0) {
                                    const firstError = Object.values(formik.errors)[0];
                                    if (firstError) {
                                        toast.error(`Please fix: ${firstError}`);
                                    }
                                    return;
                                }
                                formik.handleSubmit();
                            }}
                            loading={isLoading}
                            disabled={preparingImages}
                            className="flex-1 mt-0 lg:flex-none"
                            type="button">
                            {preparingImages
                                ? "Preparing image…"
                                : isLoading
                                    ? "Updating..."
                                    : "Update Product"}
                        </PageActionButton>
                    </div>
                ),
            }}>
            <div className="bg-surface-subtle min-h-full">
                <form onSubmit={formik.handleSubmit} className="pb-4">
                    {/* Product Images & Basic Info */}
                    <div className="bg-surface mb-4 shadow-card">
                        <DisclosureButton
                                expanded={expandedSections.basic}
                                onClick={() => toggleSection('basic')}
                                className="w-full p-4 flex items-center justify-between border-b border-outline-subtle hover:bg-surface-subtle"
                            >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-foreground-primary">Basic Information</h2>
                                <p className="text-body text-foreground-secondary">Images, title, and pricing</p>
                            </div>
                            {expandedSections.basic ? (
                                <BiChevronUp className="h-5 w-5 text-foreground-muted" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-foreground-muted" />
                            )}
                        </DisclosureButton>
                        {expandedSections.basic && (
                            <div className="p-4">
                                {/* Product Images Section - Horizontal Scroll Layout */}
                                <div className="w-full mb-6">

                                    {/* Image Horizontal Scroll Display */}
                                    {formik.values?.images && formik.values.images.length > 0 && (
                                        <div className="overflow-x-auto mb-4">
                                            <div className="flex gap-3 pb-2">
                                                {formik.values.images.map((image: ImageProps, index: number) => (
                                                    <div
                                                        key={`${image.name}-${index}`}
                                                        className={`relative flex-shrink-0 w-24 h-24 rounded-card overflow-hidden border cursor-move transition-all duration-200 ${
                                                            dragOverIndex === index
                                                                ? "border-brandDeep border-dashed"
                                                                : draggedIndex === index
                                                                ? "border-brandDeep opacity-50"
                                                                : "border-outline"
                                                        }`}
                                                        draggable
                                                        onDragStart={() => handleDragStart(index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragLeave={handleDragLeave}
                                                        onClick={() => setSelectedImageIndex(selectedImageIndex === index ? null : index)}
                                                    >
                                                        {/* Image */}
                                                        <Image
                                                            src={image?.base64 || ""}
                                                            alt={image?.name || `Image ${index + 1}`}
                                                            width={96}
                                                            height={96}
                                                            className="w-full h-full object-cover"
                                                        />

                                                        {/* Delete Button - Only show when image is selected */}
                                                        {selectedImageIndex === index && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteImage(index);
                                                                    setSelectedImageIndex(null);
                                                                }}
                                                                className="absolute top-1 right-1 bg-surface rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
                                                                aria-label="Delete image"
                                                            >
                                                                <X className="h-3 w-3 text-foreground-secondary" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Image Button */}
                                    <div className="w-full">
                                        <label
                                            aria-busy={preparingImages}
                                            className={`block w-full bg-surface-subtle px-4 py-4 font-medium rounded-card text-body text-brandDeep border-2 border-dashed border-outline transition-colors group ${
                                                preparingImages
                                                    ? "cursor-wait opacity-70"
                                                    : "hover:border-brandDeep cursor-pointer"
                                            }`}>
                                            <div className="flex items-center justify-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    disabled={preparingImages}
                                                    className="hidden"
                                                    onChange={handleAddImage}
                                                />
                                                {preparingImages ? (
                                                    <>
                                                        <Loader variant="inline" />
                                                        <span>Preparing image…</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-5 w-5 text-brandDeep group-hover:scale-110 transition-transform" />
                                                        <span>Add image</span>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    {/* Image Counter */}
                                    {formik.values?.images && formik.values.images.length > 0 && (
                                        <div className="mt-2 text-body text-foreground-muted text-center">
                                            {formik.values.images.length} image{formik.values.images.length !== 1 ? 's' : ''} added
                                            <span className="ml-2 text-body-sm text-foreground-muted">
                                                • Drag to reorder
                                            </span>
                                        </div>
                                    )}

                                    {formik.errors.images && (
                                        <div className="text-error-foreground text-body mt-2">
                                            {formik.errors.images as string}
                                        </div>
                                    )}
                                </div>

                                {/* Product Title */}
                                <div className="w-full mb-4">
                                    <InputField
                                        type="text"
                                        name="title"
                                        placeholder="Product Title"
                                        value={formik.values?.title || ""}
                                        onChange={formik.handleChange}
                                        error={formik.errors.title as string}
                                    />
                                </div>

                                {/* Price Fields */}
                                <div className="w-full space-y-3">
                                    <div className="flex w-full gap-3">
                                        <div className="flex-1 min-w-0">
                                            <InputField
                                                type="number"
                                                name="price"
                                                placeholder="Price"
                                                value={formik.values?.price || ""}
                                                onChange={formik.handleChange}
                                                error={formik.errors.price as string}
                                                showNairaSymbol={true}
                                                inputMode="numeric"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <InputField
                                                type="number"
                                                name="comparePrice"
                                                placeholder="Old price (optional)"
                                                value={formik.values?.comparePrice || ""}
                                                onChange={formik.handleChange}
                                                error={formik.errors.comparePrice as string}
                                                showNairaSymbol={true}
                                                inputMode="numeric"
                                            />
                                        </div>
                                    </div>

                                    {/* Discount Indicator */}
                                    {formik.values?.price && formik.values?.comparePrice &&
                                     Number(formik.values.comparePrice) > Number(formik.values.price) && (
                                        <div className="bg-success-surface border border-success-border rounded-card p-3">
                                            <div className="flex items-center gap-2">
                                                <CircleCheck size={16} className="text-success-foreground" />
                                                <span className="text-body font-medium text-success-foreground">
                                                    {Math.round(((Number(formik.values.comparePrice) - Number(formik.values.price)) / Number(formik.values.comparePrice)) * 100)}% discount
                                                </span>
                                            </div>
                                            <p className="text-body-sm text-success-foreground mt-1">
                                                Customers love discounts! This will help your product stand out.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="bg-surface mb-4 shadow-card">
                        <DisclosureButton
                                expanded={expandedSections.details}
                                onClick={() => toggleSection('details')}
                                className="w-full p-4 flex items-center justify-between border-b border-outline-subtle hover:bg-surface-subtle"
                            >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-foreground-primary">Product Details</h2>
                                <p className="text-body text-foreground-secondary">Description, category, and collections</p>
                            </div>
                            {expandedSections.details ? (
                                <BiChevronUp className="h-5 w-5 text-foreground-muted" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-foreground-muted" />
                            )}
                        </DisclosureButton>
                        {expandedSections.details && (
                            <div className="p-4">
                                {/* Product Description */}
                                <div className="mb-6">
                                    <InputField
                                        type="textarea"
                                        name="description"
                                        placeholder="Tell your story... What makes this product special?"
                                        value={formik.values?.description || ""}
                                        onChange={formik.handleChange}
                                        error={formik.errors.description as string}
                                        className="h-[72px]"
                                    />
                                </div>

                                {/* Product Category */}
                                <div className="mb-6">
                                    <CategorySelector
                                        mode="product"
                                        selectedCategory={selectedCategory ?? undefined}
                                        onCategorySelect={(category) => {
                                            if (typeof category === 'object') {
                                                setSelectedCategory(category);
                                                // Also set in formik for validation and submission
                                                formik.setFieldValue('categoryId', category.categoryId);
                                                formik.setFieldValue('subCategoryId', category.subCategoryId);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Product Collections */}
                                <div className="mb-6">
                                    <CollectionComponent formik={formik} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Inventory & Variations */}
                    <div className="bg-surface mb-4 shadow-card">
                        <DisclosureButton
                            expanded={expandedSections.inventory}
                            onClick={() => toggleSection('inventory')}
                            className="w-full p-4 flex items-center justify-between border-b border-outline-subtle hover:bg-surface-subtle"
                        >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-foreground-primary">Inventory & Variations</h2>
                                <p className="text-body text-foreground-secondary">Stock management and product options</p>
                            </div>
                            {expandedSections.inventory ? (
                                <BiChevronUp className="h-5 w-5 text-foreground-muted" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-foreground-muted" />
                            )}
                        </DisclosureButton>
                        {expandedSections.inventory && (
                            <div className="p-4">
                                {/* Inventory Stocks */}
                                <div className="mb-6">
                                    <InputField
                                        type="number"
                                        name="stock"
                                        placeholder={isVariable && variations.length > 0 ? "Total stock from variants" : "Inventory stocks"}
                                        value={formik.values?.stock || ""}
                                        onChange={formik.handleChange}
                                        error={formik.errors.stock as string}
                                        disabled={isVariable && variations.length > 0}
                                    />
                                    {isVariable && variations.length > 0 && variantDetails.length > 0 && (
                                        <div className="text-info-foreground text-body mt-1">
                                            ✓ Auto-calculated from {variantDetails.length} variant combinations
                                        </div>
                                    )}
                                </div>

                                {/* Enhanced Product Options */}
                                <EnhancedProductOptions
                                    formik={formik}
                                    isVariableProduct={isVariable}
                                    onToggleVariableProduct={(value) => {
                                        setIsVariable(value);
                                        if (!value) {
                                            // Clear all variant state when disabling - including formik values
                                            setVariations([{ option: "size", name: "Size", values: [] }]);
                                            setVariantDetails([]);
                                            // ARCHITECTURAL FIX: Clear single source of truth (variants only)
                                            // PRD: "REMOVE separate combination state, KEEP single variants state"
                                            formik.setFieldValue('variants', []);
                                            formik.setFieldValue('is_combination', false);
                                        }
                                    }}
                                    visibleSections={expandedSections}
                                    onToggleSection={() => {}}
                                    existingVariations={variations}
                                    existingVariantDetails={variantDetails}
                                    onVariationsUpdate={(updatedVariations, updatedVariantDetails) => {
                                        setVariations(updatedVariations);
                                        setVariantDetails(updatedVariantDetails);

                                        // CRITICAL FIX: Sync parent state when child applies templates
                                        // This ensures is_combination: true is sent to backend when templates generate variants
                                        const hasVariants = updatedVariations.length > 0 &&
                                                          updatedVariations.some(v => v.values && v.values.length > 0);
                                        if (hasVariants && !isVariable) {
                                            setIsVariable(true);
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </PageShell>
    );
}
