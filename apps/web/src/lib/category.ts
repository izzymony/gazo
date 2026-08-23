// Backend category emoji mappings - Enhanced for comprehensive 13-category system
export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  // Men's Fashion
  "Men's Fashion": '👔',
  'Clothing': '👕',
  'Shoes & Footwear': '👞',
  'Bags & Accessories': '💼',
  'Traditional & Cultural Wear': '🧣',
  'Activewear': '🏋️',
  
  // Women's Fashion
  "Women's Fashion": '👗',
  'Women\'s Clothing': '👚',
  'Women\'s Shoes & Footwear': '👠',
  'Women\'s Bags & Accessories': '👜',
  'Women\'s Traditional & Cultural Wear': '👘',
  'Women\'s Activewear': '🏋️‍♀️',
  
  // Kids Fashion
  "Kids Fashion": '👶',
  'Baby Clothing': '👶',
  'School Wear': '🎒',
  'Party Wear': '🎉',
  'Kids Shoes & Footwear': '👟',
  'Kids Bags & Accessories': '🎒',
  'Kids Traditional & Cultural Wear': '👘',
  
  // Beauty & Personal Care
  'Beauty & Personal Care': '💄',
  'Skincare': '🧴',
  'Makeup': '💋',
  'Haircare': '💇‍♀️',
  'Fragrances': '🌸',
  "Men's Grooming": '🪒',
  'Personal Hygiene': '🧼',
  
  // Home & Living
  'Home & Living': '🏡',
  'Furniture': '🛋️',
  'Home Decor': '🖼️',
  'Kitchen & Dining': '🍽️',
  'Storage & Organization': '📦',
  
  // Food & Beverages
  'Food & Beverages': '🍽️',
  'Snacks & Confectioneries': '🍫',
  'Groceries': '🥦',
  'Beverages': '☕',
  'Health Foods': '🥗',
  'Meal Prep & Ready-to-Eat': '🍱',
  
  // Gadgets
  'Gadgets': '📱',
  'Phone Accessories': '📱',
  'Wearable Technology': '⌚',
  'Small Electronics': '🔌',
  
  // Electronics
  'Electronics': '📱',
  'Mobile Phones & Accessories': '📱',
  'Computers & Laptops': '💻',
  'Audio & Headphones': '🎧',
  'Gaming & Console': '🎮',
  'Smart Home & IoT': '🏠',
  'Cameras & Photography': '📸',
  
  // Auto & Accessories
  'Auto & Accessories': '🚗',
  'Car Care & Maintenance': '🛞',
  'Auto Parts & Tools': '🔧',
  'Auto Accessories': '🏍️',
  
  // Books & Educational
  'Books & Educational': '📚',
  'Books & Novels': '📚',
  'Educational Supplies': '✏️',
  'Office & Stationery': '📋',
  
  // Sports & Outdoor
  'Sports & Outdoor': '🏋️',
  'Fitness Equipment': '💪',
  'Outdoor Gear': '⛺',
  'Cycling & Bicycles': '🚴',
  
  // Music & Entertainment
  'Music & Entertainment': '🎵',
  'Musical Instruments': '🎸',
  'Concert & DJ Equipment': '🎧',
  
  // Other
  'Other': '📦',
  'Miscellaneous': '📦'
};

// Helper function to get emoji for category name
export const getCategoryEmoji = (categoryName: string): string => {
  // Direct match first
  if (CATEGORY_EMOJI_MAP[categoryName]) {
    return CATEGORY_EMOJI_MAP[categoryName];
  }
  
  // Partial match for backend categories
  const lowerCaseName = categoryName.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (lowerCaseName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCaseName)) {
      return emoji;
    }
  }
  
  return '📦'; // Default fallback
};

// Store categories - Simple business types for stores
export const storeCategories = [
  { id: "1", name: "Fashion Store", emoji: "👗" },
  { id: "2", name: "Electronics Store", emoji: "📱" },
  { id: "3", name: "Beauty & Wellness", emoji: "💄" },
  { id: "4", name: "Home & Living Store", emoji: "🏡" },
  { id: "5", name: "Food & Beverages", emoji: "🍽️" },
  { id: "6", name: "Automotive", emoji: "🚗" },
  { id: "7", name: "Books & Education", emoji: "📚" },
  { id: "8", name: "Sports & Fitness", emoji: "🏋️" },
  { id: "9", name: "Arts & Crafts", emoji: "🎨" },
  { id: "10", name: "Health & Pharmacy", emoji: "🏥" },
  { id: "11", name: "Kids & Baby", emoji: "👶" },
  { id: "12", name: "Music & Entertainment", emoji: "🎵" },
  { id: "13", name: "Other", emoji: "📦" },
];

// Product categories - Complete 13-category system with 44 subcategories
export const categories = [
  {
    name: "Men's Fashion",
    emoji: "👔",
    subcategories: [
      { 
        name: "Clothing", 
        emoji: "👕",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.35
        }
      },
      { 
        name: "Shoes & Footwear", 
        emoji: "👞",
        shippingDefaults: {
          lengthCm: 33,
          widthCm: 22,
          heightCm: 12,
          weightKg: 1.00
        }
      },
      { 
        name: "Bags & Accessories", 
        emoji: "💼",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 28,
          heightCm: 10,
          weightKg: 0.80
        }
      },
      { 
        name: "Traditional & Cultural Wear", 
        emoji: "🧣",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 30,
          heightCm: 5,
          weightKg: 0.60
        }
      },
      { 
        name: "Activewear", 
        emoji: "🏋️",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.40
        }
      },
    ],
    id: "1",
    shipbubbleCategoryId: "74794423"
  },
  {
    name: "Women's Fashion",
    emoji: "👗",
    subcategories: [
      { 
        name: "Clothing", 
        emoji: "👚",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.35
        }
      },
      { 
        name: "Shoes & Footwear", 
        emoji: "👠",
        shippingDefaults: {
          lengthCm: 33,
          widthCm: 22,
          heightCm: 12,
          weightKg: 1.00
        }
      },
      { 
        name: "Bags & Accessories", 
        emoji: "👜",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 28,
          heightCm: 10,
          weightKg: 0.80
        }
      },
      { 
        name: "Traditional & Cultural Wear", 
        emoji: "👘",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 30,
          heightCm: 5,
          weightKg: 0.60
        }
      },
      { 
        name: "Activewear", 
        emoji: "🏋️‍♀️",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.40
        }
      },
    ],
    id: "2",
    shipbubbleCategoryId: "74794423"
  },
  {
    name: "Kids Fashion",
    emoji: "👶",
    subcategories: [
      { 
        name: "Baby Clothing", 
        emoji: "👶",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.35
        }
      },
      { 
        name: "School Wear", 
        emoji: "🎒",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.35
        }
      },
      { 
        name: "Party Wear", 
        emoji: "🎉",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 3,
          weightKg: 0.35
        }
      },
      { 
        name: "Shoes & Footwear", 
        emoji: "👟",
        shippingDefaults: {
          lengthCm: 33,
          widthCm: 22,
          heightCm: 12,
          weightKg: 1.00
        }
      },
      { 
        name: "Bags & Accessories", 
        emoji: "🎒",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 28,
          heightCm: 10,
          weightKg: 0.80
        }
      },
      { 
        name: "Traditional & Cultural Wear", 
        emoji: "👘",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 30,
          heightCm: 5,
          weightKg: 0.60
        }
      },
    ],
    id: "3",
    shipbubbleCategoryId: "74794423"
  },
  {
    name: "Beauty & Personal Care",
    emoji: "💄",
    subcategories: [
      { 
        name: "Skincare", 
        emoji: "🧴",
        shippingDefaults: {
          lengthCm: 18,
          widthCm: 13,
          heightCm: 8,
          weightKg: 0.25
        }
      },
      { 
        name: "Makeup", 
        emoji: "💋",
        shippingDefaults: {
          lengthCm: 18,
          widthCm: 13,
          heightCm: 8,
          weightKg: 0.25
        }
      },
      { 
        name: "Haircare", 
        emoji: "💇‍♀️",
        shippingDefaults: {
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          weightKg: 0.35
        }
      },
      { 
        name: "Fragrances", 
        emoji: "🌸",
        shippingDefaults: {
          lengthCm: 18,
          widthCm: 13,
          heightCm: 8,
          weightKg: 0.25
        }
      },
      { 
        name: "Men's Grooming", 
        emoji: "🪒",
        shippingDefaults: {
          lengthCm: 18,
          widthCm: 13,
          heightCm: 8,
          weightKg: 0.25
        }
      },
      { 
        name: "Personal Hygiene", 
        emoji: "🧼",
        shippingDefaults: {
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          weightKg: 0.30
        }
      },
    ],
    id: "4",
    shipbubbleCategoryId: "99652979"
  },
  {
    name: "Home & Living",
    emoji: "🏡",
    subcategories: [
      { 
        name: "Furniture", 
        emoji: "🛋️",
        shippingDefaults: {
          lengthCm: 80,
          widthCm: 60,
          heightCm: 20,
          weightKg: 12.00
        }
      },
      { 
        name: "Home Decor", 
        emoji: "🖼️",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 10,
          weightKg: 1.50
        }
      },
      { 
        name: "Kitchen & Dining", 
        emoji: "🍽️",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 30,
          heightCm: 15,
          weightKg: 2.00
        }
      },
      { 
        name: "Storage & Organization", 
        emoji: "📦",
        shippingDefaults: {
          lengthCm: 40,
          widthCm: 35,
          heightCm: 15,
          weightKg: 1.80
        }
      },
    ],
    id: "5",
    shipbubbleCategoryId: "25590994" // Furniture default, smart-selected based on subcategory
  },
  {
    name: "Food & Beverages",
    emoji: "🍽️",
    subcategories: [
      { 
        name: "Snacks & Confectioneries", 
        emoji: "🍫",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 12,
          weightKg: 1.20
        }
      },
      { 
        name: "Groceries", 
        emoji: "🥦",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 15,
          weightKg: 2.00
        }
      },
      { 
        name: "Beverages", 
        emoji: "☕",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 15,
          weightKg: 2.50
        }
      },
      { 
        name: "Health Foods", 
        emoji: "🥗",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 12,
          weightKg: 1.00
        }
      },
      { 
        name: "Meal Prep & Ready-to-Eat", 
        emoji: "🍱",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 10,
          weightKg: 1.50
        }
      },
    ],
    id: "6",
    shipbubbleCategoryId: "24032950" // Default dry food, smart-selected based on subcategory
  },
  {
    name: "Gadgets",
    emoji: "📱",
    subcategories: [
      { 
        name: "Phone Accessories", 
        emoji: "📱",
        shippingDefaults: {
          lengthCm: 20,
          widthCm: 15,
          heightCm: 5,
          weightKg: 0.30
        }
      },
      { 
        name: "Wearable Technology", 
        emoji: "⌚",
        shippingDefaults: {
          lengthCm: 18,
          widthCm: 13,
          heightCm: 8,
          weightKg: 0.25
        }
      },
      { 
        name: "Small Electronics", 
        emoji: "🔌",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 10,
          weightKg: 0.80
        }
      },
    ],
    id: "7",
    shipbubbleCategoryId: "77179563"
  },
  {
    name: "Electronics",
    emoji: "📱",
    subcategories: [
      { 
        name: "Mobile Phones & Accessories", 
        emoji: "📱",
        shippingDefaults: {
          lengthCm: 20,
          widthCm: 15,
          heightCm: 8,
          weightKg: 0.50
        }
      },
      { 
        name: "Computers & Laptops", 
        emoji: "💻",
        shippingDefaults: {
          lengthCm: 45,
          widthCm: 35,
          heightCm: 15,
          weightKg: 3.50
        }
      },
      { 
        name: "Audio & Headphones", 
        emoji: "🎧",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 12,
          weightKg: 1.00
        }
      },
      { 
        name: "Gaming & Console", 
        emoji: "🎮",
        shippingDefaults: {
          lengthCm: 40,
          widthCm: 30,
          heightCm: 20,
          weightKg: 2.50
        }
      },
      { 
        name: "Smart Home & IoT", 
        emoji: "🏠",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 10,
          weightKg: 1.20
        }
      },
      { 
        name: "Cameras & Photography", 
        emoji: "📸",
        shippingDefaults: {
          lengthCm: 35,
          widthCm: 28,
          heightCm: 15,
          weightKg: 2.00
        }
      },
    ],
    id: "8",
    shipbubbleCategoryId: "77179563"
  },
  {
    name: "Auto & Accessories",
    emoji: "🚗",
    subcategories: [
      { 
        name: "Car Care & Maintenance", 
        emoji: "🛞",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 12,
          weightKg: 1.50
        }
      },
      { 
        name: "Auto Parts & Tools", 
        emoji: "🔧",
        shippingDefaults: {
          lengthCm: 40,
          widthCm: 30,
          heightCm: 20,
          weightKg: 3.00
        }
      },
      { 
        name: "Auto Accessories", 
        emoji: "🏍️",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 15,
          weightKg: 1.20
        }
      },
    ],
    id: "9",
    shipbubbleCategoryId: "20754594" // Default light items, smart-selected based on weight
  },
  {
    name: "Books & Educational",
    emoji: "📚",
    subcategories: [
      { 
        name: "Books & Novels", 
        emoji: "📚",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 8,
          weightKg: 0.80
        }
      },
      { 
        name: "Educational Supplies", 
        emoji: "✏️",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 10,
          weightKg: 1.00
        }
      },
      { 
        name: "Office & Stationery", 
        emoji: "📋",
        shippingDefaults: {
          lengthCm: 25,
          widthCm: 20,
          heightCm: 8,
          weightKg: 0.60
        }
      },
    ],
    id: "10",
    shipbubbleCategoryId: "20754594"
  },
  {
    name: "Sports & Outdoor",
    emoji: "🏋️",
    subcategories: [
      { 
        name: "Fitness Equipment", 
        emoji: "💪",
        shippingDefaults: {
          lengthCm: 50,
          widthCm: 40,
          heightCm: 25,
          weightKg: 5.00
        }
      },
      { 
        name: "Outdoor Gear", 
        emoji: "⛺",
        shippingDefaults: {
          lengthCm: 40,
          widthCm: 35,
          heightCm: 20,
          weightKg: 2.50
        }
      },
      { 
        name: "Cycling & Bicycles", 
        emoji: "🚴",
        shippingDefaults: {
          lengthCm: 150,
          widthCm: 80,
          heightCm: 50,
          weightKg: 15.00
        }
      },
    ],
    id: "11",
    shipbubbleCategoryId: "20754594" // Default light items, smart-selected for equipment
  },
  {
    name: "Music & Entertainment",
    emoji: "🎵",
    subcategories: [
      { 
        name: "Musical Instruments", 
        emoji: "🎸",
        shippingDefaults: {
          lengthCm: 100,
          widthCm: 40,
          heightCm: 30,
          weightKg: 3.00
        }
      },
      { 
        name: "Concert & DJ Equipment", 
        emoji: "🎧",
        shippingDefaults: {
          lengthCm: 60,
          widthCm: 45,
          heightCm: 25,
          weightKg: 8.00
        }
      },
    ],
    id: "12",
    shipbubbleCategoryId: "20754594" // Default light items, smart-selected
  },
  {
    name: "Other",
    emoji: "📦",
    subcategories: [
      { 
        name: "Miscellaneous", 
        emoji: "📦",
        shippingDefaults: {
          lengthCm: 30,
          widthCm: 25,
          heightCm: 15,
          weightKg: 1.00
        },
        requiresCustomShipping: true
      },
    ],
    id: "13",
    shipbubbleCategoryId: "20754594"
  },
];

// Shipbubble category mapping for smart selection
export const SHIPBUBBLE_CATEGORIES = {
  FASHION_WEARS: "74794423",
  HEALTH_AND_BEAUTY: "99652979", 
  FURNITURE_AND_FITTINGS: "25590994",
  LIGHT_WEIGHT_ITEMS: "20754594",
  HOT_FOOD: "98190590",
  DRY_FOOD: "24032950",
  GROCERIES: "2178251",
  ELECTRONICS_AND_GADGETS: "77179563",
  MACHINERY: "67008831",
  MEDICAL_SUPPLIES: "57487393",
  SENSITIVE_ITEMS: "67658572"
};

// Smart Shipbubble category selection based on weight and dimensions
export const getSmartShipbubbleCategoryId = (
  categoryName: string,
  subcategoryName: string,
  weight?: number,
  length?: number,
  width?: number,
  height?: number
): string => {
  // Food & Beverages smart selection
  if (categoryName === "Food & Beverages") {
    if (subcategoryName === "Meal Prep & Ready-to-Eat") return SHIPBUBBLE_CATEGORIES.HOT_FOOD;
    if (subcategoryName === "Groceries") return SHIPBUBBLE_CATEGORIES.GROCERIES;
    return SHIPBUBBLE_CATEGORIES.DRY_FOOD; // Default for snacks, health foods, etc.
  }
  
  // Home & Living smart selection
  if (categoryName === "Home & Living") {
    if (subcategoryName === "Furniture" || (weight && weight > 10)) {
      return SHIPBUBBLE_CATEGORIES.FURNITURE_AND_FITTINGS;
    }
    return SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS; // For decor, kitchen items
  }
  
  // Auto & Accessories smart selection
  if (categoryName === "Auto & Accessories") {
    if (subcategoryName === "Auto Parts & Tools" || (weight && weight > 2)) {
      return SHIPBUBBLE_CATEGORIES.MACHINERY;
    }
    return SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS; // For accessories, care products
  }
  
  // Sports & Outdoor smart selection
  if (categoryName === "Sports & Outdoor") {
    if (subcategoryName === "Fitness Equipment" || subcategoryName === "Cycling & Bicycles" || (weight && weight > 4)) {
      return SHIPBUBBLE_CATEGORIES.MACHINERY;
    }
    return SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS; // For smaller outdoor gear
  }
  
  // Music & Entertainment smart selection
  if (categoryName === "Music & Entertainment") {
    if (subcategoryName === "Concert & DJ Equipment" || (weight && weight > 5)) {
      return SHIPBUBBLE_CATEGORIES.ELECTRONICS_AND_GADGETS;
    }
    return SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS; // For smaller instruments
  }
  
  // Default category mappings
  const categoryMap: Record<string, string> = {
    "Men's Fashion": SHIPBUBBLE_CATEGORIES.FASHION_WEARS,
    "Women's Fashion": SHIPBUBBLE_CATEGORIES.FASHION_WEARS,
    "Kids Fashion": SHIPBUBBLE_CATEGORIES.FASHION_WEARS,
    "Beauty & Personal Care": SHIPBUBBLE_CATEGORIES.HEALTH_AND_BEAUTY,
    "Gadgets": SHIPBUBBLE_CATEGORIES.ELECTRONICS_AND_GADGETS,
    "Electronics": SHIPBUBBLE_CATEGORIES.ELECTRONICS_AND_GADGETS,
    "Books & Educational": SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS,
    "Other": SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS,
  };
  
  return categoryMap[categoryName] || SHIPBUBBLE_CATEGORIES.LIGHT_WEIGHT_ITEMS;
};

// Helper function to get category by ID
export const getCategoryById = (id: string) => {
  return categories.find(cat => cat.id === id);
};

// Helper function to get subcategory shipping defaults
export const getSubcategoryShippingDefaults = (categoryName: string, subcategoryName: string) => {
  const category = categories.find(cat => cat.name === categoryName);
  if (!category) return null;
  
  const subcategory = category.subcategories.find(sub => sub.name === subcategoryName);
  return subcategory?.shippingDefaults || null;
};

// Export category names for easy reference
export const CATEGORY_NAMES = categories.map(cat => cat.name);
export const SUBCATEGORY_NAMES = categories.flatMap(cat => 
  cat.subcategories.map(sub => sub.name)
);