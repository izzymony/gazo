/**
 * Quota-Safe Storage Wrapper
 * Prevents app crashes from localStorage QuotaExceededError
 */

interface StorageInterface {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

const createQuotaSafeStorage = (): StorageInterface => {
  return {
    getItem: (name: string) => {
      try {
        return localStorage.getItem(name);
      } catch (error) {
        console.warn(`[QuotaSafeStorage] Failed to get item "${name}":`, error);
        return null;
      }
    },

    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn(`[QuotaSafeStorage] Quota exceeded for "${name}". Attempting cleanup...`);

          // Strategy 1: Clear old/large items first
          try {
            // Clear known large storage items
            const largePotentialKeys = [
              'business-store-v2',
              'product',
              'auth-store',
              'productDraft'
            ];

            for (const key of largePotentialKeys) {
              if (key !== name && localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`[QuotaSafeStorage] Cleared large item: ${key}`);
              }
            }

            // Try setting again after cleanup
            localStorage.setItem(name, value);
            console.log(`[QuotaSafeStorage] Successfully set "${name}" after cleanup`);
          } catch (retryError) {
            console.warn(`[QuotaSafeStorage] Still failed after cleanup for "${name}". Falling back to memory storage.`);
            // Could implement in-memory fallback here if needed
          }
        } else {
          console.warn(`[QuotaSafeStorage] Failed to set item "${name}":`, error);
        }
      }
    },

    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn(`[QuotaSafeStorage] Failed to remove item "${name}":`, error);
      }
    }
  };
};

// Storage size monitoring utilities
export const getStorageStats = () => {
  try {
    let totalSize = 0;
    const itemSizes: Record<string, number> = {};

    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemSize = (localStorage[key] || '').length;
        itemSizes[key] = itemSize;
        totalSize += itemSize;
      }
    }

    return {
      totalSize,
      itemSizes,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      quota: '5-10MB (browser dependent)'
    };
  } catch (error) {
    console.warn('[getStorageStats] Failed to calculate storage stats:', error);
    return null;
  }
};

// Emergency cleanup for app initialization
export const emergencyStorageCleanup = () => {
  console.log('[EmergencyCleanup] Starting localStorage cleanup...');

  try {
    const stats = getStorageStats();
    if (stats) {
      console.log('[EmergencyCleanup] Current storage usage:', stats);

      // If total size is over 3MB, aggressively clean
      if (stats.totalSize > 3 * 1024 * 1024) {
        console.log('[EmergencyCleanup] High storage usage detected. Clearing large items...');

        // Clear all known problematic stores
        const storesToClear = [
          'business-store-v2',
          'product',
          'productDraft',
          'auth-store'
        ];

        for (const store of storesToClear) {
          if (localStorage.getItem(store)) {
            localStorage.removeItem(store);
            console.log(`[EmergencyCleanup] Cleared: ${store}`);
          }
        }

        const newStats = getStorageStats();
        if (newStats) {
          console.log('[EmergencyCleanup] After cleanup:', newStats);
        }
      }
    }
  } catch (error) {
    console.warn('[EmergencyCleanup] Failed during cleanup:', error);
  }
};

export default createQuotaSafeStorage;