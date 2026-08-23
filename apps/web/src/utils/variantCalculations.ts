// Pure calculation functions for variant combinations
// These functions mirror the backend logic for consistent results

import { ProductData, Variant, VariantCombination } from "@/lib/types";

/**
 * Generate all possible variant combinations
 * This replaces the need to fetch combinations from API
 */
export function calculateAllCombinations(product: ProductData): VariantCombination[] {
  const variants = product.variants;
  if (!variants || variants.length === 0) {
    return [];
  }

  const combinations = generateCombinationMatrix(variants);

  return combinations.map(combo => ({
    key: combo.key,
    values: combo.values,
    price: calculateComboPrice(variants, combo, product),
    stock: calculateComboStock(variants, combo, product),
    images: calculateComboImages(variants, combo, product),
    status: calculateComboStatus(variants, combo, product),
  }));
}

/**
 * Generate cartesian product of all variant values
 */
function generateCombinationMatrix(variants: Variant[]): Array<{ key: string; values: string[] }> {
  if (variants.length === 0) return [];

  function generate(index: number, current: string[]): string[][] {
    if (index >= variants.length) {
      return [current.slice()]; // Return a copy
    }

    const results: string[][] = [];
    for (const value of variants[index].types) {
      results.push(...generate(index + 1, [...current, value]));
    }
    return results;
  }

  const combinations = generate(0, []);

  return combinations.map(combo => ({
    key: combo.join('-'),
    values: combo,
  }));
}

/**
 * Calculate price for a specific combination
 */
function calculateComboPrice(
  variants: Variant[],
  combo: { values: string[] },
  product: ProductData
): number {
  const basePrice = parseFloat(product.price?.toString() || '0');
  let price = basePrice;

  // Apply price adjustments from variants that own pricing
  variants.forEach((variant, index) => {
    if (index < combo.values.length && variantOwnsProperty(variant, 'price')) {
      const value = combo.values[index];
      if (variant.price_values && variant.price_values[value] !== undefined) {
        price += variant.price_values[value];
      }
    }
  });

  return price;
}

/**
 * Calculate stock for a specific combination
 */
function calculateComboStock(
  variants: Variant[],
  combo: { values: string[] },
  product: ProductData
): number {
  // Find which variant owns stock
  for (let index = 0; index < variants.length && index < combo.values.length; index++) {
    const variant = variants[index];
    if (variantOwnsProperty(variant, 'stock')) {
      const value = combo.values[index];
      if (variant.stock_values && variant.stock_values[value] !== undefined) {
        return variant.stock_values[value];
      }
    }
  }

  // Fall back to base stock
  return parseInt(product.stock?.toString() || '0');
}

/**
 * Calculate images for a specific combination
 */
function calculateComboImages(
  variants: Variant[],
  combo: { values: string[] },
  product: ProductData
): string[] {
  // Find which variant owns images
  for (let index = 0; index < variants.length && index < combo.values.length; index++) {
    const variant = variants[index];
    if (variantOwnsProperty(variant, 'image')) {
      const value = combo.values[index];
      if (variant.image_values && variant.image_values[value]) {
        return [variant.image_values[value]];
      }
    }
  }

  // Fall back to base images
  return product.image || [];
}

/**
 * Calculate status for a combination
 */
function calculateComboStatus(
  variants: Variant[],
  combo: { values: string[] },
  product: ProductData
): 'active' | 'out_of_stock' {
  const stock = calculateComboStock(variants, combo, product);
  return stock > 0 ? 'active' : 'out_of_stock';
}

/**
 * Check if a variant owns a specific property type
 */
function variantOwnsProperty(variant: Variant, property: string): boolean {
  return variant.owned_properties?.includes(property) || false;
}

/**
 * Calculate properties for a specific variant selection
 * Used when user selects variants on product pages
 */
export function calculateSelectedVariant(
  product: ProductData,
  selection: { [variantName: string]: string }
): VariantCombination | null {
  const variants = product.variants;
  if (!variants || variants.length === 0) {
    return null;
  }

  // Convert selection to values array
  const values = variants.map(variant => selection[variant.name] || '');

  if (values.some(v => !v)) {
    // Incomplete selection - return null
    return null;
  }

  const combo = { values };
  const stock = calculateComboStock(variants, combo, product);

  return {
    key: values.join('-'),
    values,
    price: calculateComboPrice(variants, combo, product),
    stock,
    images: calculateComboImages(variants, combo, product),
    status: stock > 0 ? 'active' : 'out_of_stock',
  };
}

/**
 * Generate variant selection string for orders
 * Used when adding items to cart with variant selection
 */
export function generateVariantSelectionString(
  product: ProductData,
  selection: { [variantName: string]: string }
): string {
  if (!product.variants) return '';

  return product.variants
    .map(variant => selection[variant.name] || '')
    .filter(value => value)
    .join('-');
}

/**
 * Validate variant configuration
 * Ensures only one variant owns each property type
 */
export function validateVariantConfiguration(product: ProductData): {
  isValid: boolean;
  errors: string[];
} {
  const variants = product.variants;
  if (!variants) return { isValid: true, errors: [] };

  const errors: string[] = [];
  const propertyOwners: { [property: string]: string[] } = {
    price: [],
    stock: [],
    image: [],
  };

  variants.forEach(variant => {
    variant.owned_properties?.forEach(property => {
      if (propertyOwners[property]) {
        propertyOwners[property].push(variant.name);
      }
    });
  });

  Object.entries(propertyOwners).forEach(([property, owners]) => {
    if (owners.length > 1) {
      errors.push(`Multiple variants own ${property}: ${owners.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}