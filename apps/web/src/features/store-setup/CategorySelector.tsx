/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Button from "@vibaar/ui/common/Button";
import InputField from "@vibaar/ui/common/InputField";
import Dialog from "@vibaar/ui/common/Dialog";
import { BiChevronDown, X } from "@vibaar/ui/icons";
import { categories as productCategories, storeCategories, getCategoryEmoji } from "@/lib/category";
import { useCategories } from "@/hooks/useCategories";

interface CategorySelectorProps {
  mode: 'store' | 'product';
  selectedCategory?: string | { categoryId: string; subCategoryId: string };
  onCategorySelect: (category: string | { categoryId: string; subCategoryId: string }) => void;
  error?: string;
}


const CategorySelector = ({ mode, selectedCategory, onCategorySelect, error }: CategorySelectorProps) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOriginalCategory, setSelectedOriginalCategory] = useState<any>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Fetch real categories from backend for product mode
  const { categories: backendCategories, loading: categoriesLoading, error: categoriesError } = useCategories();

  // Use appropriate categories based on mode
  const categoriesToUse = mode === 'store' ? storeCategories : (backendCategories.length > 0 ? backendCategories : productCategories);
  
  // Filter categories based on search term
  const filteredCategories = categoriesToUse.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Handle both hardcoded categories (subcategories) and backend categories (sub_categories)
    ((item.subcategories && item.subcategories.some((sub: any) => 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )) || (item.sub_categories && item.sub_categories.some((sub: any) => 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )))
  );

  const handleCategoryConfirm = () => {
    if (mode === 'store') {
      // Store mode: return simple category name (string)
      if (selectedOriginalCategory?.name) {
        onCategorySelect(selectedOriginalCategory.name);
        setShowModal(false);
      }
    } else {
      // Product mode: return category and subcategory IDs
      if (selectedOriginalCategory?.id) {
        const categoryId = selectedOriginalCategory.id;
        const subCategoryId = selectedSubcategory?.id || "";
        onCategorySelect({ categoryId, subCategoryId });
        setShowModal(false);
      }
    }
  };

  const handleCategoryClick = (category: any) => {
    setSelectedOriginalCategory(category);
    if (expandedCategories.includes(category.id)) {
      setExpandedCategories(expandedCategories.filter(id => id !== category.id));
    } else {
      setExpandedCategories([...expandedCategories, category.id]);
    }
  };


  console.log('🔍 CategorySelector - selectedCategory prop:', selectedCategory);
  console.log('🔍 CategorySelector - mode:', mode);
  
  // Get display text for product mode
  const getDisplayText = () => {
    if (mode === 'store') {
      return (typeof selectedCategory === "string" ? selectedCategory : "") || "Select store category";
    } else {
      // Product mode - show "Parent Category > Sub Category" format
      if (typeof selectedCategory === 'object' && selectedCategory?.subCategoryId) {
        // First try backend categories, then fallback to hardcoded ones
        let category = backendCategories.find(cat => cat.id === selectedCategory.categoryId);
        if (!category) {
          category = productCategories.find(
            cat => cat.id === selectedCategory.categoryId
          ) as unknown as (typeof backendCategories)[number];
        }
        
        if (category) {
          // Find subcategory by ID or name
          let subcategory;
          if (selectedSubcategory && selectedSubcategory.name) {
            subcategory = selectedSubcategory;
          } else {
            // Try backend subcategories first
            if (category.sub_categories) {
              subcategory = category.sub_categories.find(sub => 
                sub.name === selectedCategory.subCategoryId || sub.id === selectedCategory.subCategoryId
              );
            }
            // Fallback to hardcoded subcategories
            if (!subcategory && (category as any).subcategories) {
              subcategory = (category as any).subcategories.find((sub: any) => 
                sub.name === selectedCategory.subCategoryId || sub.id === selectedCategory.subCategoryId
              );
            }
          }
          
          if (subcategory) {
            return `${category.name} > ${subcategory.name}`;
          }
        }
      }
      return "Select product category";
    }
  };
  
  const displayText = getDisplayText();

  return (
    <>
      <div
        onClick={() => {
          // Set the current selection based on the selectedCategory prop
          if (selectedCategory && mode === 'store') {
            // Find the matching category from store categories
            const matchingCategory = storeCategories.find(cat => cat.name === selectedCategory);
            if (matchingCategory) {
              setSelectedOriginalCategory(matchingCategory);
            }
          } else if (selectedCategory && mode === 'product') {
            // For product mode, handle the complex selectedCategory format
            // This would need more complex parsing if selectedCategory contains both category and subcategory
          }
          setShowModal(true);
        }}
        className={`flex flex-col relative w-full px-3 h-[52px] rounded-field border ${
          error ? "border-error-border focus-within:ring-error-foreground" : "border-ink-20 focus-within:ring-black"
        } focus-within:ring-1 cursor-pointer`}>
        
        {/* Floating label */}
        <label className={`absolute transition-all duration-200 ease-in-out pointer-events-none
          ${selectedCategory 
            ? "text-caption font-medium text-ink-20 top-[8px] left-3"
            : "text-body text-ink-60 top-1/2 transform -translate-y-1/2 left-3"
          }`}>
          {mode === 'product' ? 'Product category' : 'Store category'}
        </label>
        
        {/* Selected value or empty space */}
        <div className="flex items-center justify-between w-full h-full">
          <p className={`text-body font-medium ${selectedCategory ? "text-ink-90 mt-[18px]" : "text-transparent"}`}>
            {selectedCategory ? displayText : ''}
          </p>
          <BiChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {error && <small className="text-brandDeep">{error}</small>}

      {/* Category Selection Modal - Responsive Design */}
      {showModal && (
        <Dialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          ariaLabel="Select a category"
          className="md:max-w-lg px-4 pt-1 pb-4 md:p-6 rounded-t-[20px] md:rounded-[20px] lg:rounded-[24px] max-h-[85vh] md:max-h-[80vh] overflow-hidden shadow-xl md:shadow-2xl relative"
        >
          <div className="flex flex-col space-y-4">
            {/* Close button - positioned absolutely, hidden on mobile */}
            <button
              onClick={() => setShowModal(false)}
              className="hidden md:flex absolute top-3 right-3 md:top-4 md:right-4 lg:top-5 lg:right-5 w-8 h-8 items-center justify-center rounded-full hover:bg-ink-5 transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={20} className="text-ink-60" />
            </button>

            {/* Modal Header with handle and search */}
            <div className="w-full flex flex-col items-center">
              <p className="text-ink-90 text-body-lg font-medium mb-4">
                Select a category
              </p>
              <InputField
                type="text"
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                placeholder="Select category"
                showSearch={true}
              />
            </div>
            
            {/* Loading state */}
            {mode === 'product' && categoriesLoading && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ink-90 mx-auto"></div>
                <p className="text-ink-50 mt-2">Loading categories...</p>
              </div>
            )}
            
            {/* Error state */}
            {mode === 'product' && categoriesError && (
              <div className="p-4 text-center">
                <p className="text-error-foreground">{categoriesError}</p>
                <Button onClick={() => window.location.reload()} className="mt-2">Retry</Button>
              </div>
            )}
            
            {/* Category List */}
            <div className="max-h-[438px] overflow-y-scroll scrollbar-hide">
              {/* Render categories based on mode */}
              {!categoriesLoading && !categoriesError && filteredCategories && filteredCategories.length > 0 ? (
                filteredCategories.map((category: any) => (
                  <div key={category.id} className="w-full p-2 bg-white">
                    {/* Main Category */}
                    <div
                      onClick={() => {
                        if (mode === 'store') {
                          // For store mode: select and close after a brief delay to show selection
                          setSelectedOriginalCategory(category);
                          console.log('🔍 CategorySelector - Selecting store category:', category.name);
                          console.log('🔍 CategorySelector - onCategorySelect callback:', onCategorySelect);
                          setTimeout(() => {
                            console.log('🔍 CategorySelector - Calling onCategorySelect with:', category.name);
                            onCategorySelect(category.name);
                            setShowModal(false);
                          }, 200); // Brief delay to show selection
                        } else {
                          // For product mode: only expand/collapse, don't select parent
                          handleCategoryClick(category);
                        }
                      }}
                      className={
                        (mode === 'store' && selectedOriginalCategory?.id === category.id)
                          ? "flex cursor-pointer text-body font-normal items-center relative text-ink-90 px-2 py-2 rounded-field bg-brand/10 border-brandDeep border justify-between"
                          : "flex cursor-pointer text-body font-normal relative items-center text-ink-90 px-2 py-2 rounded-field justify-between"
                      }>
                      <div className="flex gap-1 items-center">
                        <span className="text-xl mr-3">{category.emoji || getCategoryEmoji(category.name)}</span>
                        {category.name}
                      </div>
                      {mode === 'store' ? (
                        <input
                          type="checkbox"
                          checked={selectedOriginalCategory?.id === category.id}
                          className="custom-checkbox"
                          readOnly
                        />
                      ) : (
                        <BiChevronDown 
                          size={20} 
                          className={`transition-transform ${
                            expandedCategories.includes(category.id) ? 'rotate-180' : ''
                          }`} 
                        />
                      )}
                    </div>

                    {/* Subcategories (Only for product mode) */}
                    {mode === 'product' && expandedCategories.includes(category.id) && (category.subcategories || category.sub_categories) && (
                      <div className="mx-4 space-y-2">
                        {/* Use backend sub_categories if available, otherwise use hardcoded subcategories */}
                        {(category.sub_categories || category.subcategories).map((sub: any, index: number) => (
                          <div
                            key={index}
                            onClick={() => {
                              setSelectedSubcategory(sub);
                              // For product mode, we need both parent and subcategory selections
                              setSelectedOriginalCategory(category);
                              // Auto-close modal after selecting subcategory
                              setTimeout(() => {
                                const categoryId = category.id;
                                const subCategoryId = sub.id || sub.name; // Use name as ID if no ID exists
                                console.log('🔍 CategorySelector - Selecting subcategory:', { categoryId, subCategoryId, subcategoryName: sub.name });
                                onCategorySelect({ categoryId, subCategoryId });
                                setShowModal(false);
                              }, 200);
                            }}
                            className={`cursor-pointer text-body font-normal px-2 py-2 rounded-[4px] flex items-center justify-between ${
                              selectedSubcategory?.name === sub.name
                                ? "bg-brand/10 border-brandDeep border text-brandDeep"
                                : "text-ink-70 hover:bg-ink-5"
                            }`}>
                            <div className="flex items-center">
                              <span className="text-h2 mr-2">{sub.emoji || getCategoryEmoji(sub.name)}</span>
                              {sub.name}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedSubcategory?.name === sub.name}
                              className="custom-checkbox"
                              readOnly
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-ink-50">
                  No categories available
                </div>
              )}
            </div>
            
            {/* Select Button - Only show for product mode */}
            {mode === 'product' && (
              <Button className="max-w-full" onClick={handleCategoryConfirm} type="button">
                Select category
              </Button>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
};

export default CategorySelector;
