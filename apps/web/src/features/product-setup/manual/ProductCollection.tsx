import React, { useState, useEffect, useRef } from "react";
import { FormikProps } from "formik";
import { ImageProps, VariantDetail, Variation } from "@/lib/types";
import useBusinessStore from "@/store/businessStore";

interface CollectionComponentProps {
  // Receives Formik instances of different value shapes across the product-setup
  // flows (edit / manual / progressive). W4 will unify these on a shared
  // ProductFormValues type; until then accept any Formik shape.
  formik: FormikProps<any>;
}

export default function CollectionComponent({
  formik,
}: CollectionComponentProps) {
  const [newCollection, setNewCollection] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { fetchExistingTags } = useBusinessStore();

  // Load existing tags on component mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await fetchExistingTags();
        setAvailableTags(tags);
        setFilteredTags(tags);
      } catch (error) {
        console.error("Failed to load existing tags:", error);
      }
    };
    loadTags();
  }, [fetchExistingTags]);

  // Filter tags based on input value
  useEffect(() => {
    if (newCollection.trim() === "") {
      setFilteredTags(availableTags);
    } else {
      const filtered = availableTags.filter(tag =>
        tag.toLowerCase().includes(newCollection.toLowerCase()) &&
        !formik.values.tags?.includes(tag)
      );
      setFilteredTags(filtered);
    }
  }, [newCollection, availableTags, formik.values.tags]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyCollectionPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCollection();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleKeyCollectionBlur = () => {
    // Only add collection if dropdown is not open (to allow clicking suggestions)
    setTimeout(() => {
      if (!showSuggestions) {
        handleAddCollection();
      }
    }, 150);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCollection(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (tag: string) => {
    const currentTags = formik.values.tags || [];
    if (!currentTags.includes(tag)) {
      formik.setFieldValue("tags", [...currentTags, tag]);
    }
    setNewCollection("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAddCollection = () => {
    if (newCollection.trim() !== "") {
      const currentTags = formik.values.tags || [];
      formik.setFieldValue("tags", [
        ...currentTags,
        newCollection.trim(),
      ]);
      setNewCollection(""); // Clear input after adding
    }
  };

  const handleRemoveCollection = (collection: string) => {
    formik.setFieldValue(
      "tags",
      formik.values?.tags?.filter((col: string) => col !== collection)
    );
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col space-y-2">
        <div className="relative flex flex-col space-y-1 border border-outline-strong rounded-field p-3 font-medium text-body">
          <label htmlFor={"collection"}>Product Collections</label>

          <div className="flex items-center flex-wrap gap-2">
            {formik.values.tags?.map((collection: string, index: number) => (
              <span
                key={index}
                className="bg-surface-strong flex flex-row items-center gap-2 text-foreground-secondary text-body-sm px-4 rounded-full space-x-2">
                {collection}
                <button
                  type="button"
                  onClick={() => handleRemoveCollection(collection)}
                  aria-label={`Remove ${collection}`}
                  className="text-caption flex items-center h-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1">
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-grow">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or create collection"
                name="collection"
                value={newCollection}
                onChange={handleInputChange}
                onKeyDown={handleKeyCollectionPress}
                onFocus={handleInputFocus}
                onBlur={handleKeyCollectionBlur}
                className="relative text-caption bg-transparent placeholder:text-foreground-secondary font-bold focus:ring-0 focus:ring-outline-strong focus:outline-none w-full"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredTags.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 z-dropdown mt-1 bg-surface border border-outline rounded-card shadow-lg max-h-40 overflow-y-auto"
                >
                  {filteredTags.slice(0, 10).map((tag, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(tag)}
                      className="w-full text-left px-3 py-2 text-body-sm hover:bg-surface-subtle transition-colors border-b border-outline-subtle last:border-b-0"
                    >
                      <span className="font-medium text-foreground-secondary">{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Button for Mobile */}
            <button
              type="button"
              onClick={handleAddCollection}
              className="px-3 py-1 bg-brand text-brandInk text-body-sm rounded-field shrink-0">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
