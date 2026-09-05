"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@vibaar/ui/common/Button";
import Checkbox from "@vibaar/ui/common/Checkbox";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  X,
  Plus,
  Photo,
  Check,
  CiLock,
} from "@vibaar/ui/icons";

// ===== INTERFACES =====
type PropertyType = 'price' | 'stock' | 'image';

interface PropertyOwnership {
  price: string | null;    // variant ID that owns price, or null if base product owns it
  stock: string | null;    // variant ID that owns stock, or null if base product owns it
  image: string | null;    // variant ID that owns image, or null if base product owns it
}

interface SmartVariation {
  id: string;
  name: string;
  values: string[];
  ownedProperties: PropertyType[];
  stockValues?: { [value: string]: number }; // Stock amount for each value
  priceValues?: { [value: string]: number }; // Price amount for each value
  imageValues?: { [value: string]: string }; // Image URL for each value
}

interface FormikVariation {
  option?: string;
  name?: string;
  values?: string[];
  ownedProperties?: PropertyType[];  // Add support for owned properties in formik data
  stockValues?: { [value: string]: number }; // Stock amount for each value
  priceValues?: { [value: string]: number }; // Price amount for each value
  imageValues?: { [value: string]: string }; // Image URL for each value
}

interface VariationCombination {
  id: string;
  combination: string;
  price: number | null;
  stock: number | null;
  image?: string;
  imageFile?: File;
  variantId?: string;  // Which variant this combination belongs to
}

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  variations: Omit<SmartVariation, 'id'>[];
}

interface EnhancedProductOptionsProps {
  formik: any;
  isVariableProduct: boolean;
  onToggleVariableProduct: (checked: boolean) => void;
  visibleSections: any;
  onToggleSection: (section: string) => void;
  onVariationsUpdate?: (variations: any[], variantDetails: any[]) => void;
  existingVariations?: any[];
  existingVariantDetails?: any[];
}

// ===== TEMPLATES =====
const VARIATION_TEMPLATES: Template[] = [
  {
    id: "clothing",
    name: "Clothing & Fashion",
    icon: "👕",
    description: "Perfect for Nigerian fashion - ankara, agbada, casual wear",
    variations: [
      { name: "Color", values: ["Red", "White", "Black", "Blue", "Green"], ownedProperties: [] },
      { name: "Size", values: ["S", "M", "L", "XL", "XXL"], ownedProperties: [] },
      { name: "Material", values: ["Cotton", "Silk", "Linen", "Leather"], ownedProperties: [] }
    ]
  },
  {
    id: "electronics",
    name: "Electronics & Phones",
    icon: "📱",
    description: "Popular in Nigeria - iPhones, Samsungs, accessories",
    variations: [
      { name: "Model", values: ["iPhone 14", "iPhone 13", "Samsung S23"], ownedProperties: [] },
      { name: "Storage", values: ["64GB", "128GB", "256GB"], ownedProperties: [] },
      { name: "Color", values: ["Space Gray", "Silver", "Gold"], ownedProperties: [] }
    ]
  },
  {
    id: "beauty",
    name: "Beauty & Personal Care",
    icon: "💄",
    description: "Beauty products with shades and sizes",
    variations: [
      { name: "Shade", values: ["Light", "Medium", "Dark"], ownedProperties: [] },
      { name: "Size", values: ["Small", "Regular", "Large"], ownedProperties: [] }
    ]
  },
  {
    id: "home",
    name: "Home & Living",
    icon: "🏡",
    description: "Home products with colors and sizes",
    variations: [
      { name: "Color", values: ["White", "Black", "Brown"], ownedProperties: [] },
      { name: "Size", values: ["Small", "Medium", "Large"], ownedProperties: [] }
    ]
  }
];

// ===== UTILITY FUNCTIONS =====
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ===== PROPERTY MANAGEMENT FUNCTIONS =====
const assignPropertyToVariant = (
  variations: SmartVariation[],
  variantId: string,
  property: PropertyType
): SmartVariation[] => {
  return variations.map(variant => {
    if (variant.id === variantId) {
      // Add property to this variant
      return {
        ...variant,
        ownedProperties: [...(variant.ownedProperties || []).filter(p => p !== property), property]
      };
    } else {
      // Remove property from other variants
      return {
        ...variant,
        ownedProperties: (variant.ownedProperties || []).filter(p => p !== property)
      };
    }
  });
};

const removePropertyFromVariant = (
  variations: SmartVariation[],
  variantId: string,
  property: PropertyType
): SmartVariation[] => {
  return variations.map(variant => {
    if (variant.id === variantId) {
      return {
        ...variant,
        ownedProperties: (variant.ownedProperties || []).filter(p => p !== property)
      };
    }
    return variant;
  });
};

const getPropertyOwner = (variations: SmartVariation[], property: PropertyType): string | null => {
  const owner = variations.find(v => v.ownedProperties?.includes(property));
  return owner ? owner.id : null;
};

const getAvailableProperties = (
  variations: SmartVariation[],
  variantId: string
): PropertyType[] => {
  const allProperties: PropertyType[] = ['price', 'stock', 'image'];
  const currentVariant = variations.find(v => v.id === variantId);
  if (!currentVariant) return [];

  return allProperties.filter(property => {
    const owner = getPropertyOwner(variations, property);
    return owner === null || owner === variantId;
  });
};

const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

const generateCombinations = (variations: SmartVariation[]): string[] => {
  if (variations.length === 0) return [];

  const validVariations = variations.filter(v => v.values.length > 0);
  if (validVariations.length === 0) return [];
  if (validVariations.length === 1) return validVariations[0].values;

  let combinations = validVariations[0].values;
  for (let i = 1; i < validVariations.length; i++) {
    const newCombinations: string[] = [];
    combinations.forEach(combo => {
      validVariations[i].values.forEach(value => {
        newCombinations.push(`${combo} / ${value}`);
      });
    });
    combinations = newCombinations;
  }
  return combinations;
};

// Transform SmartVariation to FormikVariation
const smartToFormik = (smartVariations: SmartVariation[]): FormikVariation[] => {
  return smartVariations.map((v, index) => ({
    option: `Option ${index + 1}`,
    name: v.name,
    values: v.values,
    ownedProperties: v.ownedProperties,  // Preserve owned properties when converting back
    stockValues: v.stockValues || {},  // Preserve stock values
    priceValues: v.priceValues || {},   // Preserve price values
    imageValues: v.imageValues || {}    // Preserve image values
  }));
};

// Transform FormikVariation to SmartVariation
const formikToSmart = (formikVariations: FormikVariation[]): SmartVariation[] => {
  return formikVariations.map((v, index) => ({
    id: generateId(),
    name: v.name || '',
    values: v.values || [],
    ownedProperties: v.ownedProperties || [],  // Preserve existing owned properties
    stockValues: v.stockValues || {},  // Preserve stock values
    priceValues: v.priceValues || {},   // Preserve price values
    imageValues: v.imageValues || {}    // Preserve image values
  }));
};

// ===== ICON COMPONENTS (HugeIcons; call sites unchanged) =====
const ChevronDownIcon = () => <ChevronDown size={20} className="text-foreground-secondary" />;
const ChevronRightIcon = () => <ChevronRight size={16} className="text-foreground-muted" />;
const EditIcon = () => <Edit size={20} className="text-brandDeep" />;
const CloseIcon = () => <X size={16} className="text-foreground-secondary" />;
const PlusIcon = () => <Plus size={16} className="text-brandDeep" />;
const ImageIcon = () => <Photo size={24} className="text-foreground-muted" />;

// Delegates to the shared Checkbox primitive.
const CheckBox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => <Checkbox checked={checked} onChange={onChange} label={label} />;

// ===== PROPERTY TOGGLE COMPONENT =====
const PropertyToggle = ({
  property,
  isActive,
  isAvailable,
  onClick
}: {
  property: PropertyType;
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
}) => {
  const getPropertyIcon = (prop: PropertyType) => {
    switch (prop) {
      case 'price':
        return '₦';
      case 'stock':
        return 'X';
      case 'image':
        return '🖼';
      default:
        return '';
    }
  };

  const getPropertyLabel = (prop: PropertyType) => {
    switch (prop) {
      case 'price':
        return 'Price';
      case 'stock':
        return 'Stock';
      case 'image':
        return 'Image';
      default:
        return '';
    }
  };

  return (
    <button
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-full text-body font-medium transition-all
        ${isActive
          ? 'bg-brand text-brandInk border border-brandDeep'
          : isAvailable
            ? 'bg-surface text-foreground-secondary border border-outline-strong hover:border-brandDeep'
            : 'bg-surface-muted text-foreground-muted border border-outline cursor-not-allowed'
        }
      `}
    >
      {isActive && <Check size={12} />}
      <span className="text-body-sm">{getPropertyIcon(property)}</span>
      <span>{getPropertyLabel(property)}</span>
      {!isAvailable && !isActive && <CiLock size={12} />}
    </button>
  );
};

// ===== VARIATIONS MODAL COMPONENT =====
const VariationsModal = ({
  isOpen,
  onClose,
  variations,
  variantCombinations,
  onVariationsChange,
  onCombinationsChange,
  onVariationsUpdate,
  formik
}: {
  isOpen: boolean;
  onClose: () => void;
  variations: SmartVariation[];
  variantCombinations: VariationCombination[];
  onVariationsChange: (variations: SmartVariation[]) => void;
  onCombinationsChange: (combinations: VariationCombination[]) => void;
  onVariationsUpdate?: (updatedVariations: any[], updatedVariantDetails: any[]) => void;
  formik?: any;
}) => {
  // Initialize with safe defaults - will be properly set when modal opens
  const [basePrice, setBasePrice] = useState(1000);
  const [baseStock, setBaseStock] = useState(1000);

  // Initialize base values from formik when modal opens
  useEffect(() => {
    if (isOpen && formik?.values) {
      const price = formik.values.price;

      // Update price if valid
      if (price && price !== "" && !isNaN(Number(price)) && Number(price) > 0) {
        setBasePrice(Number(price));
      }

      // For stock initialization, check if any variation owns stock property
      const isVariableProduct = formik.values.variants && formik.values.variants.length > 0;
      const hasCustomStock = isVariableProduct && formik.values.variants.some((v: FormikVariation) =>
        v.ownedProperties?.includes('stock')
      );

      if (!hasCustomStock) {
        // Only use base inventory stock if no custom stock properties are set
        const stock = formik.values.inventoryStocks;
        if (stock && stock !== "" && !isNaN(Number(stock)) && Number(stock) > 0) {
          setBaseStock(Number(stock));
        } else {
          // Only fallback to default when no inventory was set and no custom stock
          setBaseStock(100);
        }
      } else {
        // If custom stock is enabled, don't override base stock from inventory
        // Base stock will be used for variants that don't have custom stock set
        setBaseStock(100); // Default per variant
      }
    }
  }, [isOpen]); // Removed formik.values.inventoryStocks from dependencies to prevent loop

  // Property management functions
  const handlePropertyToggle = (variantId: string, property: PropertyType) => {
    const currentVariant = variations.find(v => v.id === variantId);
    if (!currentVariant) return;

    const isCurrentlyOwned = currentVariant.ownedProperties?.includes(property) || false;

    if (isCurrentlyOwned) {
      // Remove property from this variant
      const updatedVariations = removePropertyFromVariant(variations, variantId, property);
      onVariationsChange(updatedVariations);
    } else {
      // Assign property to this variant (automatically removes from others)
      const updatedVariations = assignPropertyToVariant(variations, variantId, property);
      onVariationsChange(updatedVariations);
    }
  };

  // Generate combinations when variations change - but only final items, not pricing logic
  useEffect(() => {
    if (variations.length > 0) {
      const combinations = generateCombinations(variations);
      const newCombinations: VariationCombination[] = combinations.map(combo => {
        // Calculate stock for this combination based on variant properties
        let calculatedStock = baseStock;

        // Split combination to get individual values (e.g., "Red / S / Cotton" -> ["Red", "S", "Cotton"])
        const comboValues = combo.split(' / ');

        // For each variation that owns stock property, get the stock for this value
        let calculatedImage: string | undefined;
        variations.forEach((variation, varIndex) => {
          if (variation.ownedProperties?.includes('stock') && comboValues[varIndex]) {
            const currentValue = comboValues[varIndex];
            // Use the specific stock value if available, otherwise distribute evenly
            if (variation.stockValues && variation.stockValues[currentValue] !== undefined) {
              calculatedStock = variation.stockValues[currentValue];
            } else {
              // Fallback to equal distribution
              const stockPerValue = Math.floor(baseStock / (variation.values?.length || 1));
              calculatedStock = stockPerValue;
            }
          }

          // Get image for this variation value if it owns image property
          if (variation.ownedProperties?.includes('image') && comboValues[varIndex]) {
            const currentValue = comboValues[varIndex];
            if (variation.imageValues && variation.imageValues[currentValue]) {
              calculatedImage = variation.imageValues[currentValue];
            }
          }
        });

        // Calculate price for this combination based on variant properties
        let calculatedPrice = basePrice;

        // For each variation that owns price property, get the price adjustment for this value
        variations.forEach((variation, varIndex) => {
          if (variation.ownedProperties?.includes('price') && comboValues[varIndex]) {
            const currentValue = comboValues[varIndex];
            // Use the specific price adjustment if available
            if (variation.priceValues && variation.priceValues[currentValue] !== undefined) {
              calculatedPrice = basePrice + variation.priceValues[currentValue];
            }
          }
        });

        return {
          id: generateId(),
          combination: combo,
          price: calculatedPrice,
          stock: calculatedStock,
          image: calculatedImage
        };
      });
      onCombinationsChange(newCombinations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variations, basePrice, baseStock]);

  const addVariation = () => {
    const newVariation: SmartVariation = {
      id: generateId(),
      name: '',
      values: [],
      ownedProperties: []  // Initialize with no owned properties
    };
    onVariationsChange([...variations, newVariation]);
  };

  const updateVariation = (id: string, updates: Partial<SmartVariation>) => {
    onVariationsChange(
      variations.map(v => v.id === id ? { ...v, ...updates } : v)
    );
  };

  const removeVariation = (id: string) => {
    onVariationsChange(variations.filter(v => v.id !== id));
  };

  const applyTemplate = (template: Template) => {
    const newVariations: SmartVariation[] = template.variations.map(v => ({
      id: generateId(),
      name: v.name,
      values: [...v.values],
      ownedProperties: []  // Initialize with no owned properties
    }));
    onVariationsChange(newVariations);

    // CRITICAL FIX: Immediately sync to formik AND parent state when template is applied
    // This prevents the "0 Sizes" issue and ensures immediate state synchronization
    const formikVars = smartToFormik(newVariations);
    if (formik) {
      formik.setFieldValue('variants', formikVars);
      console.log('🎯 Template applied: Immediately synced to formik', {
        templateName: template.name,
        variationsCount: newVariations.length,
        formikVarsLength: formikVars.length
      });
    }

    // Also immediately notify parent component of the change
    if (onVariationsUpdate) {
      const variantDetailsForParent: any[] = []; // Empty initially, combinations will be generated later
      onVariationsUpdate(formikVars, variantDetailsForParent);
      console.log('🔄 Template applied: Immediately notified parent component');
    }
  };

  const handleSave = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="bg-black/50 backdrop-blur-sm fixed inset-0 z-modal flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface bottom-0 max-h-[90vh] w-full rounded-t-2xl shadow-2xl border-t border-outline-subtle flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber */}
        <div className="flex justify-center py-3">
          <div className="bg-surface-strong h-1 rounded-full w-9"></div>
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-outline-subtle">
          <h2 className="text-h2 font-medium text-foreground-primary text-center">Manage product variations</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4">
            {/* Base Information */}

            {/* Variation Fields with Property Management */}
            <div className="pb-4">
              <SingleStepContent
                variations={variations}
                onVariationsChange={onVariationsChange}
                onAddVariation={addVariation}
                onUpdateVariation={updateVariation}
                onRemoveVariation={removeVariation}
                onApplyTemplate={applyTemplate}
                onPropertyToggle={handlePropertyToggle}
                basePrice={basePrice}
                baseStock={baseStock}
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-outline-subtle">
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="bordered"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="filled"
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== SINGLE STEP CONTENT =====
const SingleStepContent = ({
  variations,
  onVariationsChange,
  onAddVariation,
  onUpdateVariation,
  onRemoveVariation,
  onApplyTemplate,
  onPropertyToggle,
  basePrice,
  baseStock
}: {
  variations: SmartVariation[];
  onVariationsChange: (variations: SmartVariation[]) => void;
  onAddVariation: () => void;
  onUpdateVariation: (id: string, updates: Partial<SmartVariation>) => void;
  onRemoveVariation: (id: string) => void;
  onApplyTemplate: (template: Template) => void;
  onPropertyToggle: (variantId: string, property: PropertyType) => void;
  basePrice: number;
  baseStock: number;
}) => {
  // Check if we can add more variations (max 3)
  const canAddMore = variations.length < 3;

  return (
    <div className="space-y-4">
      {/* Variation Fields with Property Management */}
      {variations.map((variation, index) => (
        <VariationFieldWithProperties
          key={variation.id}
          variation={variation}
          variations={variations}
          index={index}
          onUpdate={onUpdateVariation}
          onRemove={onRemoveVariation}
          onPropertyToggle={onPropertyToggle}
          basePrice={basePrice}
          baseStock={baseStock}
        />
      ))}

      {canAddMore && (
        <button
          onClick={onAddVariation}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-brandDeep rounded-full text-brandDeep text-body font-medium hover:bg-brand/5 transition-colors"
        >
          <PlusIcon />
          <span>Add new Variant</span>
        </button>
      )}

      {!canAddMore && (
        <p className="text-body-sm text-foreground-muted text-center py-2">
          Maximum 3 variants supported for optimal property management
        </p>
      )}
    </div>
  );
};

// ===== VARIATION FIELD WITH PROPERTIES COMPONENT =====
const VariationFieldWithProperties = ({
  variation,
  variations,
  index,
  onUpdate,
  onRemove,
  onPropertyToggle,
  basePrice,
  baseStock
}: {
  variation: SmartVariation;
  variations: SmartVariation[];
  index: number;
  onUpdate: (id: string, updates: Partial<SmartVariation>) => void;
  onRemove: (id: string) => void;
  onPropertyToggle: (variantId: string, property: PropertyType) => void;
  basePrice: number;
  baseStock: number;
}) => {
  const [newValue, setNewValue] = useState('');
  const [isCustomSectionExpanded, setIsCustomSectionExpanded] = useState(false);

  const addValue = () => {
    if (newValue.trim() && !variation.values.includes(newValue.trim())) {
      onUpdate(variation.id, {
        values: [...variation.values, newValue.trim()]
      });
      setNewValue('');
    }
  };

  const removeValue = (valueToRemove: string) => {
    onUpdate(variation.id, {
      values: variation.values.filter(v => v !== valueToRemove)
    });
  };

  return (
    <div className="border border-outline rounded-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-body-sm text-foreground-muted mb-1">Variant {index + 1}</p>
          <input
            type="text"
            value={variation.name}
            onChange={(e) => onUpdate(variation.id, { name: e.target.value })}
            className="text-body-lg font-medium text-foreground-primary bg-transparent border-none outline-none p-0 w-full"
            placeholder="Size"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(variation.id)}
          aria-label={`Remove the ${variation.name || "option"} option`}
          className="p-1 hover:bg-surface-muted rounded flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1">
          <CloseIcon />
        </button>
      </div>

      {/* Option Values */}
      <div className="flex flex-wrap gap-2 mb-4">
        {variation.values.map((value) => (
          <div key={value} className="bg-surface-subtle rounded-full px-3 h-[22px] text-body flex items-center gap-2">
            <span className="text-foreground-secondary">{value}</span>
            <button
              type="button"
              onClick={() => removeValue(value)}
              aria-label={`Remove ${value}`}
              className="hover:bg-surface-strong rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Value Input */}
      <div className="flex gap-2 items-center mb-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addValue()}
          placeholder="Enter options"
          className="flex-1 text-body text-foreground-secondary bg-transparent border-none outline-none p-0 min-w-0"
        />
        {newValue && (
          <button
            onClick={addValue}
            className="text-brandDeep text-body font-medium hover:underline flex-shrink-0"
          >
            Add
          </button>
        )}
      </div>

      {/* Property Management Section */}
      <div className="border-t border-outline-subtle pt-4">
        <button
          onClick={() => setIsCustomSectionExpanded(!isCustomSectionExpanded)}
          aria-expanded={isCustomSectionExpanded}
          className={`flex items-center justify-between w-full py-2 hover:bg-surface-subtle rounded transition-colors ${isCustomSectionExpanded ? 'mb-3' : 'mb-0'}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-foreground-primary">Custom Properties</span>
            {/* Show clean property indicators */}
            <div className="flex items-center gap-1">
              {variation.ownedProperties?.includes('price') && (
                <div className="w-4 h-4 bg-brand rounded-full flex items-center justify-center" title="Custom Price">
                  <span className="text-brandInk text-body-sm font-bold">₦</span>
                </div>
              )}
              {variation.ownedProperties?.includes('stock') && (
                <div className="w-4 h-4 bg-info-foreground rounded-full flex items-center justify-center" title="Custom Stock">
                  <span className="text-white text-body-sm font-bold">#</span>
                </div>
              )}
              {variation.ownedProperties?.includes('image') && (
                <div className="w-4 h-4 bg-success-foreground rounded-full flex items-center justify-center" title="Custom Image">
                  <Photo size={10} className="text-white" />
                </div>
              )}
              {(!variation.ownedProperties || variation.ownedProperties.length === 0) && (
                <span className="text-body-sm text-foreground-muted">(optional)</span>
              )}
            </div>
          </div>

          <ChevronDown
            size={16}
            className={`text-foreground-secondary transition-transform ${isCustomSectionExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isCustomSectionExpanded && (
          <div className="space-y-4">
            <div>

              {/* Property Toggle Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['price', 'stock', 'image'] as PropertyType[]).map(property => {
                  const isActive = variation.ownedProperties?.includes(property) || false;
                  const availableProperties = getAvailableProperties(variations, variation.id);
                  const isAvailable = availableProperties.includes(property);

                  const getPropertyIcon = (prop: PropertyType) => {
                    switch (prop) {
                      case 'price': return '₦';
                      case 'stock': return 'X';
                      case 'image': return <Photo size={16} />;
                      default: return '';
                    }
                  };

                  const getPropertyLabel = (prop: PropertyType) => {
                    switch (prop) {
                      case 'price': return 'Price';
                      case 'stock': return 'Stock';
                      case 'image': return 'Image';
                      default: return '';
                    }
                  };

                  return (
                    <button
                      key={property}
                      onClick={isAvailable ? () => onPropertyToggle(variation.id, property) : undefined}
                      disabled={!isAvailable}
                      className={`
                        flex items-center justify-center gap-1 px-2 h-[22px] rounded-full text-body-sm font-medium transition-all
                        ${isActive
                          ? 'bg-brand/10 text-brandDeep'
                          : isAvailable
                            ? 'bg-surface-subtle text-foreground-secondary hover:bg-surface-strong'
                            : 'bg-surface-subtle text-foreground-muted cursor-not-allowed'
                        }
                      `}
                    >
                      {isActive && <Check size={12} />}
                      {typeof getPropertyIcon(property) === 'string' ? (
                        <span className="text-body-sm">{getPropertyIcon(property)}</span>
                      ) : (
                        getPropertyIcon(property)
                      )}
                      <span>{getPropertyLabel(property)}</span>
                      {!isAvailable && !isActive && <CiLock size={12} />}
                    </button>
                  );
                })}
              </div>

              {/* Always Show Base Information for Context */}
              <div className="flex items-center gap-4 text-body text-foreground-secondary mb-2">
                <span>Base Price ₦{basePrice}</span>
                <div className="w-1 h-1 bg-surface-strong rounded-full"></div>
                <span>Base Stock {baseStock}</span>
              </div>

              {/* Individual Option Items */}
              {variation.values.length > 0 && (
                <div className="space-y-3 mt-4">
                  {variation.values.map((value) => (
                    <div key={value} className="flex items-center gap-3">
                      {/* Image Upload */}
                      {variation.ownedProperties?.includes('image') && (
                        <div className="w-12 h-12 bg-surface-subtle rounded-card border border-outline flex-shrink-0 overflow-hidden">
                          {variation.imageValues?.[value] ? (
                            // Show uploaded image
                            <img
                              src={variation.imageValues[value]}
                              alt={value}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      onUpdate(variation.id, {
                                        imageValues: {
                                          ...variation.imageValues,
                                          [value]: reader.result as string
                                        }
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            />
                          ) : (
                            // Show upload placeholder
                            <button
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      onUpdate(variation.id, {
                                        imageValues: {
                                          ...variation.imageValues,
                                          [value]: reader.result as string
                                        }
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                              className="w-full h-full flex items-center justify-center hover:bg-surface-muted transition-colors border border-dashed border-outline-strong hover:border-outline-emphasis rounded-card cursor-pointer group"
                            >
                              <div className="w-6 h-6 rounded-full bg-surface-strong group-hover:bg-surface-strong flex items-center justify-center transition-colors">
                                <Plus size={12} className="text-foreground-muted group-hover:text-foreground-secondary" />
                              </div>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Value Name */}
                      <div className="flex-1">
                        <p className="text-body font-medium text-foreground-primary">{value}</p>
                      </div>

                      {/* Custom Inputs */}
                      {variation.ownedProperties?.includes('price') && (
                        <div className="">
                          <div className="flex items-center border border-outline rounded-field px-2 py-1.5 bg-surface">
                            <span className="text-body-sm text-foreground-muted mr-1">+ ₦</span>
                            <input
                              type="number"
                              value={variation.priceValues?.[value] || 0}
                              onChange={(e) => {
                                const newPriceValue = parseInt(e.target.value) || 0;
                                onUpdate(variation.id, {
                                  priceValues: {
                                    ...variation.priceValues,
                                    [value]: newPriceValue
                                  }
                                });
                              }}
                              className="w-16 text-body-sm bg-transparent border-none outline-none text-foreground-primary"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {variation.ownedProperties?.includes('stock') && (
                        <div className="">
                          <div className="flex items-center border border-outline rounded-field px-2 py-1.5 bg-surface">
                            <span className="text-body-sm text-foreground-muted mr-1">X</span>
                            <input
                              type="number"
                              value={variation.stockValues?.[value] || Math.floor(baseStock / variation.values.length) || 20}
                              onChange={(e) => {
                                const newStockValue = parseInt(e.target.value) || 0;
                                onUpdate(variation.id, {
                                  stockValues: {
                                    ...variation.stockValues,
                                    [value]: newStockValue
                                  }
                                });
                              }}
                              className="w-20 text-body-sm bg-transparent border-none outline-none text-foreground-primary"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {/* Remove Option */}
                      <button
                        type="button"
                        onClick={() => removeValue(value)}
                        aria-label={`Remove ${value}`}
                        className="p-1 hover:bg-surface-muted rounded flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



// ===== MAIN COMPONENT =====
export default function EnhancedProductOptions({
  formik,
  isVariableProduct,
  onToggleVariableProduct,
  visibleSections,
  onToggleSection,
  onVariationsUpdate,
  existingVariations = [],
  existingVariantDetails = []
}: EnhancedProductOptionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [variations, setVariations] = useState<SmartVariation[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<VariationCombination[]>([]);
  const [isProductOptionsCollapsed, setIsProductOptionsCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});

  // Toggle section collapse state
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Calculate counts for preview mode
  const getPreviewCounts = () => {
    const optionCount = formik.values.variants?.length || 0;
    const totalCombinations = hasCombinations
      ? variantCombinations.length
      : formik.values.variants?.reduce((acc: number, variation: FormikVariation) =>
        acc * (variation.values?.length || 0), 1) || 0;

    return { optionCount, totalCombinations };
  };

  // Initialize variations from formik
  useEffect(() => {
    if (formik.values.variants && formik.values.variants.length > 0) {
      const smartVars = formikToSmart(formik.values.variants);
      setVariations(smartVars);
    }
  }, []);

  // Initialize with existing variations and variant details from props (for edit flow)
  useEffect(() => {
    console.log('🎯 MODAL PROPS DEBUG - EnhancedProductOptions received:', {
      'existingVariations?.length': existingVariations?.length || 0,
      'existingVariantDetails?.length': existingVariantDetails?.length || 0,
      'existingVariations': existingVariations,
      'existingVariantDetails': existingVariantDetails?.slice(0, 3),
      'customPricingCount': existingVariantDetails?.filter(v => v.price)?.length || 0
    });

    if (existingVariations.length > 0) {
      // Convert existing variations to SmartVariation format
      const smartVars: SmartVariation[] = existingVariations.map((variation, index) => ({
        id: `existing-variation-${index}`,
        name: variation.name || '',
        values: variation.values || [],
        // Preserve existing custom property data from API
        ownedProperties: variation.ownedProperties || [],
        stockValues: variation.stockValues || {},
        priceValues: variation.priceValues || {},
        imageValues: variation.imageValues || {}
      }));

      setVariations(smartVars);

      // CRITICAL FIX: Also update formik.values.variants so hasVariations logic works correctly
      const formikVars = smartToFormik(smartVars);
      formik.setFieldValue('variants', formikVars);

      console.log('✅ Set existing variations in both state and formik:', {
        smartVars,
        formikVars
      });
    }

    if (existingVariantDetails.length > 0) {
      // Convert existing variant details to VariationCombination format
      const existingCombinations: VariationCombination[] = existingVariantDetails.map((detail, index) => ({
        id: `existing-combo-${index}`,
        combination: detail.combination || '',
        price: detail.price ? Number(detail.price) : null, // Preserve null/undefined vs 0
        stock: detail.stock || 0,
        image: undefined, // Add image support later if needed
        variantId: undefined
      }));

      setVariantCombinations(existingCombinations);
      console.log('✅ Set existing variant combinations with pricing:', {
        'combinations.length': existingCombinations.length,
        'withCustomPricing': existingCombinations.filter(c => c.price && c.price > 0).length,
        'examplePrices': existingCombinations.slice(0, 3).map(c => ({
          combo: c.combination,
          price: c.price
        }))
      });
    }
  }, [existingVariations, existingVariantDetails]);

  // Initialize existing variant combinations from formik (for edit flow)
  useEffect(() => {
    // CRITICAL: Skip formik initialization if we have props data
    // Props data from parent component takes precedence over formik
    if (existingVariantDetails && existingVariantDetails.length > 0) {
      console.log('📌 Skipping formik initialization - using props data instead');
      return; // Exit early - props-based useEffect will handle initialization
    }

    // Only use formik as fallback when no props data is available
    // Handle case where variant_combinations table doesn't exist or is empty
    if (formik.values.variant_combinations && formik.values.variant_combinations.length > 0) {
      console.log('📋 Initializing from formik.values.variant_combinations');
      const existingCombinations: VariationCombination[] = formik.values.variant_combinations.map((combo: any, index: number) => ({
        id: `existing-${index}`,
        combination: combo.combination_key || combo.combination || '',
        price: combo.price || 0,
        stock: combo.stock || 0,
        image: combo.images?.[0] || undefined,
        variantId: combo.variant_id || undefined
      }));
      setVariantCombinations(existingCombinations);
    } else if (formik.values.variants && formik.values.variants.length > 0) {
      // Fallback: Generate combinations from variations with proper stock calculation
      // Handle both create flow (inventoryStocks) and edit flow (stock)
      const baseStock = Math.max(0, Number(formik.values.inventoryStocks || formik.values.stock) || 0);
      const basePrice = Math.max(0, Number(formik.values.price) || 0);
      const smartVariations = formikToSmart(formik.values.variants);
      const generatedCombinations = generateCombinations(smartVariations);

      const fallbackCombinations: VariationCombination[] = generatedCombinations.map((combo: string, index: number) => {
        // Calculate stock for this combination based on variant properties
        let calculatedStock = baseStock;
        let calculatedPrice = basePrice;

        // Split combination to get individual values
        const comboValues = combo.split(' / ');

        // Calculate stock based on variant ownership
        smartVariations.forEach((variation, varIndex) => {
          if (variation.ownedProperties?.includes('stock') && comboValues[varIndex]) {
            const currentValue = comboValues[varIndex];
            if (variation.stockValues && variation.stockValues[currentValue] !== undefined) {
              calculatedStock = variation.stockValues[currentValue];
            } else {
              // If no specific stock value, distribute evenly
              const stockPerValue = Math.floor(baseStock / (variation.values?.length || 1));
              calculatedStock = stockPerValue;
            }
          }

          // Calculate price adjustments
          if (variation.ownedProperties?.includes('price') && comboValues[varIndex]) {
            const currentValue = comboValues[varIndex];
            if (variation.priceValues && variation.priceValues[currentValue] !== undefined) {
              calculatedPrice = basePrice + variation.priceValues[currentValue];
            }
          }
        });

        return {
          id: `fallback-${index}`,
          combination: combo,
          price: calculatedPrice,
          stock: calculatedStock,
          image: undefined,
          variantId: undefined
        };
      });

      setVariantCombinations(fallbackCombinations);
    }
  }, [existingVariantDetails]); // Added dependency to re-check when props change

  // Check if we have variations (check both variations array and variant_combinations)
  // Also check existing props and local state as fallback
  const hasVariations = (formik.values.variants && formik.values.variants.length > 0) ||
                       (formik.values.variant_combinations && formik.values.variant_combinations.length > 0) ||
                       (existingVariations && existingVariations.length > 0) ||
                       (variations && variations.length > 0);
  const hasCombinations = variantCombinations && variantCombinations.length > 0;

  // Separate logic for template visibility - only check current active state, not props fallbacks
  const shouldShowTemplates = isVariableProduct &&
                            !(formik.values.variants && formik.values.variants.length > 0) &&
                            !(formik.values.variant_combinations && formik.values.variant_combinations.length > 0) &&
                            !(variations && variations.length > 0);

  // Auto-update total inventory stock when variant combinations change
  // BUT ONLY if any variant owns stock property (has custom stock values)
  useEffect(() => {
    if (isVariableProduct && variantCombinations.length > 0) {
      // Check if any variation owns stock property (has custom stock)
      const hasCustomStock = variations.some(v => v.ownedProperties?.includes('stock'));

      if (hasCustomStock) {
        const totalStock = variantCombinations.reduce((sum, variant) => {
          const stockValue = variant.stock;
          const validStock = (typeof stockValue === 'number' && !isNaN(stockValue) && stockValue >= 0)
            ? stockValue
            : 0;
          return sum + validStock;
        }, 0);
        // Only update if the calculated total is different from current
        if (totalStock !== formik.values.inventoryStocks) {
          formik.setFieldValue('inventoryStocks', totalStock);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantCombinations, variations]);

  const handleToggleVariableProduct = useCallback(() => {
    const newValue = !isVariableProduct;
    onToggleVariableProduct(newValue);

    if (!newValue) {
      // Clear variations when disabling
      setVariations([]);
      setVariantCombinations([]);
      formik.setFieldValue('variations', []);
      formik.setFieldValue('variants', []);
      formik.setFieldValue('variant_combinations', []);
    } else {
      // When enabling variable product, clear any stale state to ensure templates show
      setVariations([]);
      setVariantCombinations([]);
      formik.setFieldValue('variants', []);
      formik.setFieldValue('variant_combinations', []);
    }
  }, [isVariableProduct, onToggleVariableProduct, formik]);

  const handleManageVariations = useCallback((template?: Template) => {
    if (template) {
      // Apply template immediately when selected
      const newVariations: SmartVariation[] = template.variations.map(v => ({
        id: generateId(),
        name: v.name,
        values: [...v.values],
        ownedProperties: []  // Initialize with no owned properties
      }));
      setVariations(newVariations);
    } else {
      // Check if we have existing variations to edit
      if (formik.values.variants && formik.values.variants.length > 0) {
        // Load existing variations for editing
        const existingVariations = formikToSmart(formik.values.variants);
        setVariations(existingVariations);
      } else {
        // When no template and no existing variations, start with one empty variation for custom creation
        const emptyVariation: SmartVariation = {
          id: generateId(),
          name: '',
          values: [],
          ownedProperties: []  // Initialize with no owned properties
        };
        setVariations([emptyVariation]);
      }
    }
    setShowModal(true);
  }, [formik.values.variants]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);

    // Sync variations back to formik
    if (variations.length > 0) {
      const formikVars = smartToFormik(variations);
      formik.setFieldValue('variants', formikVars);

      // Calculate and update total inventory stock from variant combinations
      // BUT ONLY if any variant owns stock property (has custom stock values)
      if (variantCombinations.length > 0) {
        const hasCustomStock = variations.some(v => v.ownedProperties?.includes('stock'));

        if (hasCustomStock) {
          const totalStock = variantCombinations.reduce((sum, variant) => {
            const stockValue = variant.stock;
            const validStock = (typeof stockValue === 'number' && !isNaN(stockValue) && stockValue >= 0)
              ? stockValue
              : 0;
            return sum + validStock;
          }, 0);
          formik.setFieldValue('inventoryStocks', totalStock);
        }
      }

      // Update parent component's state
      if (onVariationsUpdate) {
        const formikVars = smartToFormik(variations);
        const variantDetailsForParent = variantCombinations.map(combo => ({
          combination: combo.combination,
          price: combo.price,
          stock: combo.stock
        }));
        onVariationsUpdate(formikVars, variantDetailsForParent);
      }
    }
  }, [variations, variantCombinations, formik, onVariationsUpdate]);

  return (
    <>
      <div className="w-full">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-outline-subtle">
          <button
            onClick={() => setIsProductOptionsCollapsed(!isProductOptionsCollapsed)}
            aria-expanded={!isProductOptionsCollapsed}
            className="flex items-center gap-3 flex-1"
          >
            <h2 className="text-body-lg font-medium text-foreground-primary">Product options</h2>
            <ChevronDown
              size={16}
              className={`text-foreground-secondary transition-transform ml-auto ${isProductOptionsCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Content */}
        {isProductOptionsCollapsed ? (
          /* Collapsed Preview Mode */
          <div className="py-3">
            {isVariableProduct && hasVariations ? (
              <p className="text-body text-foreground-secondary">
                {(() => {
                  const { optionCount, totalCombinations } = getPreviewCounts();
                  return `${optionCount} ${optionCount === 1 ? 'option' : 'options'}, ${totalCombinations} ${totalCombinations === 1 ? 'item' : 'items'}`;
                })()}
              </p>
            ) : (
              <p className="text-body text-foreground-secondary">
                {isVariableProduct ? 'Variable product setup in progress' : 'Simple product'}
              </p>
            )}
          </div>
        ) : (
          <div className="p-0">
            {/* Variations Checkbox */}
            <div className="my-3">
              <CheckBox
                checked={isVariableProduct}
                onChange={handleToggleVariableProduct}
                label="This product is variable; has different colors, sizes, weight, materials, etc."
              />
            </div>

            {/* Template Selection (when enabled but no variants yet) */}
            {shouldShowTemplates && (
              <div className="space-y-3">
                <p className="text-body text-foreground-secondary">
                  Choose from a template or add custom variants
                </p>

                {/* Show template based on product category - defaulting to Clothing for now */}
                <div className="space-y-3">
                  {VARIATION_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleManageVariations(template)}
                      className="w-full p-4 border border-brandDeep bg-brand/5 rounded-card text-left hover:bg-brand/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-body-lg font-medium text-brandDeep">{template.name}</h3>
                          <p className="text-body text-foreground-secondary mt-0.5">{template.description}</p>
                        </div>
                        <ChevronRightIcon />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Option */}
                <button
                  onClick={() => handleManageVariations()}
                  className="w-full p-4 border border-outline bg-surface rounded-card text-left hover:border-brandDeep/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <EditIcon />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-body-lg font-medium text-brandDeep">Create Custom variants</h3>
                      <p className="text-body text-foreground-secondary mt-0.5">Create your own</p>
                    </div>
                    <ChevronRightIcon />
                  </div>
                </button>
              </div>
            )}

            {/* Variants Display */}
            {isVariableProduct && hasVariations && (
              <div className="space-y-4">
                {/* Summary Header with Edit Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-body font-medium text-foreground-primary">
                    {(() => {
                      const variationCounts = formik.values.variants.map((v: FormikVariation) =>
                        `${v.values?.length || 0} ${v.name}s`
                      ).join(', ').replace(/,([^,]*)$/, ' &$1');
                      return variationCounts;
                    })()}
                  </h3>
                  <button
                    onClick={() => handleManageVariations()}
                    className="flex items-center gap-1 px-2 py-1 text-brandDeep text-body-sm font-medium hover:bg-brand/5 rounded transition-colors"
                  >
                    <EditIcon />
                    Edit
                  </button>
                </div>

                {/* Individual Variant Sections */}
                <div className="space-y-4">
                  {formik.values.variants.map((variation: FormikVariation, index: number) => {
                    const sectionKey = `variant-${index}`;
                    const isCollapsed = collapsedSections[sectionKey];

                    return (
                      <div key={index}>
                        {/* Variant Header - Clickable */}
                        <button
                          onClick={() => toggleSection(sectionKey)}
                          aria-expanded={!isCollapsed}
                          className="flex items-center justify-between py-2 w-full text-left hover:bg-surface-subtle rounded transition-colors"
                        >
                          <span className="text-body font-medium text-foreground-primary">
                            {variation.name} ({variation.values?.length || 0})
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-foreground-secondary transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Variant Values in Cards - Collapsible */}
                        {!isCollapsed && (
                          <div className="grid grid-cols-2 gap-3">
                            {variation.values?.map((value, valueIndex) => {
                              // Only show advanced layout if this variant has custom properties
                              const hasCustomProps = variation.ownedProperties && variation.ownedProperties.length > 0;

                              return (
                                <div key={valueIndex} className="bg-surface border border-outline rounded-card p-2 flex items-center gap-2">
                                  {/* Image if variant owns image property */}
                                  {variation.ownedProperties?.includes('image') && (
                                    <div className="w-12 h-12 bg-surface-muted rounded-card overflow-hidden flex items-center justify-center flex-shrink-0">
                                      {variation.imageValues?.[value] ? (
                                        <img
                                          src={variation.imageValues[value]}
                                          alt={value}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Photo size={20} className="text-foreground-muted" />
                                      )}
                                    </div>
                                  )}

                                  {/* Content aligned to the right of image */}
                                  <div className="flex-1 min-w-0">
                                    {/* Value Name */}
                                    <p className="text-body font-medium text-foreground-primary">{value}</p>

                                    {/* Pricing & Stock Info - Only show if specific properties are enabled */}
                                    {(variation.ownedProperties?.includes('price') || variation.ownedProperties?.includes('stock')) && (
                                      <div className="flex items-center gap-2 text-body-sm mt-1 text-foreground-secondary">
                                        {variation.ownedProperties?.includes('price') && (
                                          <span>+₦{variation.priceValues?.[value] || 0}</span>
                                        )}
                                        {variation.ownedProperties?.includes('price') && variation.ownedProperties?.includes('stock') && (
                                          <span className="text-foreground-muted">•</span>
                                        )}
                                        {variation.ownedProperties?.includes('stock') && (
                                          <span>
                                            {variation.stockValues && variation.stockValues[value] !== undefined
                                              ? `${variation.stockValues[value].toLocaleString()}X`
                                              : `${Math.floor((formik.values?.inventoryStocks || 100) / (variation.values?.length || 1))}X`
                                            }
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>


                {/* Total Variants Section - Show all actual combinations */}
                {(() => {
                  const totalCombinations = formik.values.variants.reduce((acc: number, variation: FormikVariation) =>
                    acc * (variation.values?.length || 1), 1);

                  // Show if we have multiple variants (combinations possible)
                  if (formik.values.variants.length <= 1) return null;

                  // Generate all actual combinations from the current variations state (includes uploaded images)
                  const allCombinations = generateCombinations(variations.length > 0 ? variations : formikToSmart(formik.values.variants));
                  const totalVariantsKey = 'total-variants';
                  const isTotalVariantsCollapsed = collapsedSections[totalVariantsKey];

                  return (
                    <div className="">
                      {/* Total Variants Header - Clickable */}
                      <button
                        onClick={() => toggleSection(totalVariantsKey)}
                        className="flex items-center justify-between py-2 w-full text-left hover:bg-surface-subtle rounded transition-colors"
                      >
                        <span className="text-body font-medium text-foreground-primary">
                          Total Variants ({totalCombinations})
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-foreground-secondary transition-transform ${isTotalVariantsCollapsed ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Show all actual combinations generated from variants - Collapsible */}
                      {!isTotalVariantsCollapsed && (
                        <div className="space-y-3">
                          {allCombinations.map((combo, idx) => {
                            // Check if any variation has custom properties
                            const hasAnyCustomProps = formik.values.variants.some((v: FormikVariation) =>
                              v.ownedProperties && v.ownedProperties.length > 0
                            );

                            const shouldShowCustomPrice = hasAnyCustomProps &&
                              formik.values.variants.some((v: FormikVariation) => v.ownedProperties?.includes('price'));

                            const shouldShowCustomStock = hasAnyCustomProps &&
                              formik.values.variants.some((v: FormikVariation) => v.ownedProperties?.includes('stock'));

                            const shouldShowCustomImage = hasAnyCustomProps &&
                              formik.values.variants.some((v: FormikVariation) => v.ownedProperties?.includes('image'));

                            // Get actual base values from formik - handle both create flow (inventoryStocks) and edit flow (stock)
                            const basePrice = formik.values?.price || 0;
                            const baseStock = formik.values?.inventoryStocks || formik.values?.stock || 0;
                            const baseImage = formik.values?.images?.[0]?.base64 || null;

                            return (
                              <div key={idx} className="bg-surface border border-outline rounded-card p-2 flex items-center gap-2">
                                {/* Always show image - either custom variant image, base product image, or placeholder */}
                                <div className="w-12 h-12 bg-surface-muted rounded-card overflow-hidden flex-shrink-0">
                                  {baseImage && !shouldShowCustomImage ? (
                                    // Show base product image when no custom image property is enabled
                                    <img
                                      src={baseImage}
                                      alt={combo}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : shouldShowCustomImage ? (
                                    // Show custom variant image or placeholder
                                    (() => {
                                      // Split combination to get individual values (e.g., "Red / S / Cotton" -> ["Red", "S", "Cotton"])
                                      const comboValues = combo.split(' / ');
                                      const currentVariations = variations.length > 0 ? variations : formikToSmart(formik.values.variants);

                                      // Find the first variant that owns image property and has an image for one of the values
                                      for (let i = 0; i < currentVariations.length; i++) {
                                        const variation = currentVariations[i];
                                        if (variation.ownedProperties?.includes('image') && comboValues[i]) {
                                          const currentValue = comboValues[i];
                                          if (variation.imageValues?.[currentValue]) {
                                            return (
                                              <img
                                                src={variation.imageValues[currentValue]}
                                                alt={combo}
                                                className="w-full h-full object-cover"
                                              />
                                            );
                                          }
                                        }
                                      }

                                      // Fallback to base product image if no custom image found
                                      if (baseImage) {
                                        return (
                                          <img
                                            src={baseImage}
                                            alt={combo}
                                            className="w-full h-full object-cover"
                                          />
                                        );
                                      }

                                      // Final fallback to placeholder if no base image available
                                      return (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Photo size={20} className="text-foreground-muted" />
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    // Fallback to base product image or placeholder when no image available
                                    baseImage ? (
                                      <img
                                        src={baseImage}
                                        alt={combo}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Photo size={20} className="text-foreground-muted" />
                                      </div>
                                    )
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-body font-medium text-foreground-primary">{combo}</p>
                                  <div className="flex items-center gap-2 text-body-sm text-foreground-secondary mt-1">
                                    {/* Show actual price values */}
                                    {shouldShowCustomPrice ? (
                                      (() => {
                                        // Calculate actual price for this specific combination
                                        const comboValues = combo.split(' / ');
                                        const currentVariations = variations.length > 0 ? variations : formikToSmart(formik.values.variants);
                                        let priceAdjustment = 0;

                                        // Find the variant that owns price and get the price adjustment for this combination
                                        for (let i = 0; i < currentVariations.length; i++) {
                                          const variation = currentVariations[i];
                                          if (variation.ownedProperties?.includes('price') && comboValues[i]) {
                                            const currentValue = comboValues[i];
                                            if (variation.priceValues && variation.priceValues[currentValue] !== undefined) {
                                              priceAdjustment = variation.priceValues[currentValue];
                                              break; // Use the first price adjustment found
                                            }
                                          }
                                        }

                                        const finalPrice = basePrice + priceAdjustment;
                                        return <span>₦{finalPrice.toLocaleString()}</span>;
                                      })()
                                    ) : (
                                      <span>₦{basePrice.toLocaleString()}</span>
                                    )}
                                    <span className="text-foreground-muted">•</span>
                                    {/* Show actual stock values */}
                                    {shouldShowCustomStock ? (
                                      (() => {
                                        // Calculate actual stock for this specific combination
                                        const comboValues = combo.split(' / ');
                                        const currentVariations = variations.length > 0 ? variations : formikToSmart(formik.values.variants);
                                        let actualStock = baseStock;

                                        // Find the variant that owns stock and get the stock for this combination
                                        for (let i = 0; i < currentVariations.length; i++) {
                                          const variation = currentVariations[i];
                                          if (variation.ownedProperties?.includes('stock') && comboValues[i]) {
                                            const currentValue = comboValues[i];
                                            if (variation.stockValues && variation.stockValues[currentValue] !== undefined) {
                                              actualStock = variation.stockValues[currentValue];
                                              break; // Use the first stock value found
                                            }
                                          }
                                        }

                                        return <span>{actualStock} in stock</span>;
                                      })()
                                    ) : (
                                      <span>{baseStock} in stock</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <VariationsModal
        isOpen={showModal}
        onClose={handleCloseModal}
        variations={variations}
        variantCombinations={variantCombinations}
        onVariationsChange={setVariations}
        onCombinationsChange={setVariantCombinations}
        onVariationsUpdate={onVariationsUpdate}
        formik={formik}
      />
    </>
  );
}
