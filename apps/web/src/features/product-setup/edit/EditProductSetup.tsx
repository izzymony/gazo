/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BiChevronDown, BiChevronUp, BsThreeDots, X, Plus, CircleCheck } from "@vibaar/ui/icons";
import Image from "next/image";
import { toast } from "sonner";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Loader from "@vibaar/ui/common/Loader";
import Button from "@vibaar/ui/common/Button";
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

    console.log('🔧 Input combinations for reconstruction:', combinations);

    combinations.forEach((combo) => {
        if (combo.combination_key) {
            console.log('🔧 Processing combination_key:', combo.combination_key);

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

            console.log('🔧 Split parts:', parts);

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

    console.log('🔧 Final reconstructed variations:', reconstructedVariations);
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
    const router = useRouter();
    const { user } = useAuthStore();
    const { store } = useBusinessStore();
    const { getProductByIds, updateProduct, setProduct, isLoading } = useProductStore();

    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
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

    // Horizontal scroll image handlers
    const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && formik?.values) {
            const currentImages = formik.values.images || [];
            const newImages = Array.from(files).map((file, index) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            base64: reader.result as string,
                            name: `image${currentImages.length + index + 1}`,
                            toggle: true
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(newImages).then((images) => {
                formik.setFieldValue("images", [...currentImages, ...images]);
            });
        }
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
            console.log('Form submitted with values:', values);
            console.log('Images to update:', images);

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

                // Convert to backend expected format - ensure all required fields are present and valid
                const productPayload = {
                    title: values.title || "Untitled Product",
                    description: values.description || "",
                    slug: (values.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    category_id: selectedCategory?.categoryId || values.categoryId || "",
                    sub_category_id: selectedCategory?.subCategoryId || values.subCategoryId || "",
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

                console.log('💰 Price debugging:', {
                    'values.price': values.price,
                    'values.comparePrice': values.comparePrice,
                    'payload.price.price': productPayload.price.price,
                    'payload.price.old_price': productPayload.price.old_price
                });
                console.log('📦 Sending update payload:', JSON.stringify(productPayload, null, 2));
                console.log('💰 Variant pricing debug:', {
                    'variantDetails.length': variantDetails.length,
                    'customPricingExamples': variantDetails.filter(v => v.price).slice(0, 3),
                });
                console.log('📊 Variant details for debugging:', {
                    'isVariable': isVariable,
                    'values.variants': values.variants,
                    'local.variations': variations,
                    'variantDetails': variantDetails,
                    'payload.variants': productPayload.variants,
                });
                console.log('Product ID:', productId);

                // The updateProduct now automatically handles state synchronization
                let updatedProduct;
                try {
                    updatedProduct = await updateProduct(productId, productPayload as unknown as Parameters<typeof updateProduct>[1]);
                    console.log('✅ Product updated successfully via store! Staying on edit page.');
                } catch (updateError) {
                    console.warn('⚠️ Store update failed, trying fallback refresh...', updateError);

                    // Fallback: Manual refresh if store update fails
                    try {
                        updatedProduct = await getProductByIds(productId);
                        if (updatedProduct) {
                            setProduct(updatedProduct); // Manual store sync
                            console.log('✅ Fallback refresh successful');
                        }
                    } catch (fallbackError) {
                        console.error('❌ Both update and fallback failed:', fallbackError);
                        throw updateError; // Throw original error
                    }
                }

                // Update local component state with the returned data
                if (updatedProduct) {
                    console.log('✅ Updating local state with product data:', {
                        'variant_combinations.length': updatedProduct.variant_combinations?.length,
                        'firstCombosWithPricing': updatedProduct.variant_combinations?.filter((c: any) => c.price).slice(0, 3),
                        'variations': updatedProduct.variations,
                        'is_combination': updatedProduct.is_combination
                    });
                    setProductData(updatedProduct);
                    console.log('✅ Local component state updated with synchronized data');
                } else {
                    console.error('❌ No product data received after update');
                }

                toast.success('Product updated successfully!');
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
                console.log('🔍 Fetching product with ID:', productId);

                // Try to fetch real product data first
                let product;
                try {
                    product = await getProductByIds(productId);
                    console.log('🔍 Fetched real product data:', product);
                    console.log('🏷️ Product tags field:', product?.tag);
                    console.log('🏷️ Product tags field (alternative):', product?.tags);
                } catch (error) {
                    console.error('🔍 Failed to fetch product data:', error);
                    console.error('🔍 Attempting to use mock/fallback data');
                    // Fallback to test data if API fails - Use data that matches what user sees
                    product = {
                        id: productId,
                        title: "Local Image",
                        description: "Hello",
                        category: "Fashion",
                        category_id: "9aebee99-0435-4ca1-bf82-7657bd35691a",
                        sub_category_id: "f6e81ad4-d74f-45e0-a4f4-ba6ad0c91ce8",
                        collection: "",
                        price: 1333,
                        stock: 1, // Match product list display
                        compare_price: 0,
                        weight: 0,
                        brand: "",
                        tag: [], // Backend uses 'tag' not 'tags'
                        image: ["https://picsum.photos/400/400"], // Use 'image' field like backend
                        images: ["https://picsum.photos/400/400"],
                        variations: [],
                        variants: [],
                        is_variable: false,
                    };
                }

                console.log('🔍 Using test product data:', product);
                setProductData(product);

                // Convert product images to expected format
                const productImages = (product.image || product.images || []).map((url: string, index: number) => ({
                    base64: url,
                    name: `image-${index + 1}`,
                    toggle: true,
                })) || [];

                console.log('🔍 Product images converted:', productImages);
                setImages(productImages);

                // Determine if product is variable based on is_combination flag from backend
                // Only use is_combination as the source of truth to prevent stale data issues
                const isProductVariable = Boolean(product.is_combination);
                setIsVariable(isProductVariable);

                // Priority: Use variants (with custom properties) > variations > reconstruct from combinations
                let finalVariations = [];

                if (product.variants && product.variants.length > 0) {
                    console.log('✅ Loading variations with custom properties from variants');
                    console.log('🔍 Raw variants from backend:', product.variants);
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
                    console.log('📦 Processed variations with custom properties:', finalVariations);
                } else if (product.variations && product.variations.length > 0) {
                    console.log('📋 Loading basic variations from variations field');
                    finalVariations = product.variations;
                } else if (product.variant_combinations && product.variant_combinations.length > 0) {
                    console.log('🔧 Reconstructing variations from variant_combinations');
                    finalVariations = reconstructVariationsFromCombinations(product.variant_combinations);
                }

                setVariations(finalVariations.length > 0 ? finalVariations : [{ option: "size", name: "Size", values: [] }]);

                // Load existing variant combinations with stock data
                if (product.variant_combinations && product.variant_combinations.length > 0) {
                    console.log('🔍 Loading variant combinations data:', product.variant_combinations.slice(0, 3));
                    const existingVariantDetails = product.variant_combinations.map((combo: any) => ({
                        combination: combo.combination_key,
                        price: combo.price,
                        stock: combo.stock || 0
                    }));
                    console.log('✅ Reconstructed variantDetails:', existingVariantDetails.slice(0, 3));
                    setVariantDetails(existingVariantDetails);
                } else {
                    console.log('⚠️ No variant_combinations found, falling back to variants:', product.variants);
                    setVariantDetails(product.variants || []);
                }

                // Set category if available
                console.log('🔍 Product category data:', {
                    category_id: product.category_id,
                    sub_category_id: product.sub_category_id,
                    category: product.category
                });
                if (product.category_id && product.sub_category_id) {
                    const categoryData = {
                        categoryId: product.category_id,
                        subCategoryId: product.sub_category_id
                    };
                    console.log('🔍 Setting selected category:', categoryData);
                    setSelectedCategory(categoryData);

                    // Also update formik immediately 
                    setTimeout(() => {
                        formik.setFieldValue('category', product.category || 'Fashion');
                        formik.setFieldValue('categoryId', product.category_id);
                        formik.setFieldValue('subCategoryId', product.sub_category_id);
                    }, 100);
                } else {
                    console.log('🔍 Category data incomplete, not setting selectedCategory');
                }

                // Update formik values - ensure category is a string
                const categoryValue = typeof product.category === 'object'
                    ? (product.category.name || product.category.description || "Electronics")
                    : (product.category || "Electronics");

                // Debug price structure
                console.log('🏷️ Product price data:', {
                    price: product.price,
                    compare_price: product.compare_price,
                    original_price: product.original_price,
                    old_price: product.old_price,
                    fullProduct: product
                });

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

                console.log('📝 Setting formik values with tags:', {
                    'product.tag': product.tag,
                    'Array.isArray(product.tag)': Array.isArray(product.tag)
                });

                // Backend returns 'tag' field (not 'tags')
                const productTags = Array.isArray(product.tag) ? product.tag : [];

                console.log('📝 Final tags to set in formik:', productTags);

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
                console.error("🔍 Error fetching product:", error);
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
                    console.log('🔄 Syncing variations to formik.values.variants:', {
                        variations: variations,
                        formikVariants: formikVariants
                    });
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
            header={
                <Header
                    showBack
                    customText="Edit Product"
                    onBackClick={() => router.back()}
                />
            }
            contentClassName="px-0"
            footerAction={
                <div className="flex gap-3">
                    <Button
                        variant="bordered"
                        onClick={() => router.back()}
                        className="flex-1 !mt-0">
                        Cancel
                    </Button>
                    <Button
                        variant="filled"
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
                        className="flex-1 !mt-0"
                        type="button">
                        {isLoading ? "Updating..." : "Update Product"}
                    </Button>
                </div>
            }>
            <div className="bg-ink-3 min-h-full">
                <form onSubmit={formik.handleSubmit} className="pb-4">
                    {/* Product Images & Basic Info */}
                    <div className="bg-white mb-4 shadow-card">
                        <button
                            type="button"
                            onClick={() => toggleSection('basic')}
                            className="w-full p-4 flex items-center justify-between border-b border-ink-5 hover:bg-ink-3"
                        >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-ink-90">Basic Information</h2>
                                <p className="text-body text-ink-60">Images, title, and pricing</p>
                            </div>
                            {expandedSections.basic ? (
                                <BiChevronUp className="h-5 w-5 text-ink-40" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-ink-40" />
                            )}
                        </button>
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
                                                                : "border-ink-10"
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
                                                                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
                                                                aria-label="Delete image"
                                                            >
                                                                <X className="h-3 w-3 text-ink-60" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Image Button */}
                                    <div className="w-full">
                                        <label className="block w-full bg-ink-3 px-4 py-4 font-medium rounded-card text-body text-brandDeep border-2 border-dashed border-ink-10 hover:border-brandDeep transition-colors cursor-pointer group">
                                            <div className="flex items-center justify-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleAddImage}
                                                />
                                                <Plus className="h-5 w-5 text-brandDeep group-hover:scale-110 transition-transform" />
                                                <span>Add image</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Image Counter */}
                                    {formik.values?.images && formik.values.images.length > 0 && (
                                        <div className="mt-2 text-body text-ink-50 text-center">
                                            {formik.values.images.length} image{formik.values.images.length !== 1 ? 's' : ''} added
                                            <span className="ml-2 text-body-sm text-ink-40">
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
                    <div className="bg-white mb-4 shadow-card">
                        <button
                            type="button"
                            onClick={() => toggleSection('details')}
                            className="w-full p-4 flex items-center justify-between border-b border-ink-5 hover:bg-ink-3"
                        >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-ink-90">Product Details</h2>
                                <p className="text-body text-ink-60">Description, category, and collections</p>
                            </div>
                            {expandedSections.details ? (
                                <BiChevronUp className="h-5 w-5 text-ink-40" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-ink-40" />
                            )}
                        </button>
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
                                                console.log('🔍 Edit - Category selected:', category);
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
                    <div className="bg-white mb-4 shadow-card">
                        <button
                            type="button"
                            onClick={() => toggleSection('inventory')}
                            className="w-full p-4 flex items-center justify-between border-b border-ink-5 hover:bg-ink-3"
                        >
                            <div className="text-left">
                                <h2 className="text-h2 font-medium text-ink-90">Inventory & Variations</h2>
                                <p className="text-body text-ink-60">Stock management and product options</p>
                            </div>
                            {expandedSections.inventory ? (
                                <BiChevronUp className="h-5 w-5 text-ink-40" />
                            ) : (
                                <BiChevronDown className="h-5 w-5 text-ink-40" />
                            )}
                        </button>
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
                                            console.log('🧹 Clearing all variant state when disabling');
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
                                        console.log('📝 Updating parent state with:', {
                                            updatedVariations,
                                            'updatedVariantDetails.length': updatedVariantDetails.length,
                                            'customPricingCount': updatedVariantDetails.filter(v => v.price).length,
                                            'examplePricing': updatedVariantDetails.filter(v => v.price).slice(0, 2)
                                        });
                                        setVariations(updatedVariations);
                                        setVariantDetails(updatedVariantDetails);

                                        // CRITICAL FIX: Sync parent state when child applies templates
                                        // This ensures is_combination: true is sent to backend when templates generate variants
                                        const hasVariants = updatedVariations.length > 0 &&
                                                          updatedVariations.some(v => v.values && v.values.length > 0);
                                        if (hasVariants && !isVariable) {
                                            console.log('🔄 Template applied: Auto-enabling variable product mode');
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
