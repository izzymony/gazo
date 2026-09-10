/* eslint-disable react-hooks/exhaustive-deps */
import FilterBar from "@vibaar/ui/common/FilterBar";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface VendorDataSortProps {
  onSortToggle: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: string) => void; // New prop
}

const VendorDataSort: React.FC<VendorDataSortProps> = ({
  onSortToggle,
  searchValue,
  onSearchChange,
  onFilterChange,
}) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [productTags, setProductTags] = useState<string[]>([]);
  const { stor, businessProduct } = useBusinessStore();
  const { fetchStoreTags } = useProductStore();
  const pathname = usePathname();

  // Fetch product tags instead of collections
  useEffect(() => {
    const loadProductTags = async () => {
      const isSellerPath = pathname.includes("/dashboard");

      if (isSellerPath && businessProduct.length > 0) {
        // In seller mode, use businessProduct tags
        const tags = new Set<string>();
        businessProduct.forEach(product => {
          if (product.tag && Array.isArray(product.tag)) {
            product.tag.forEach(t => tags.add(t));
          }
        });
        setProductTags(Array.from(tags));
      } else if (!isSellerPath && stor?.id) {
        // Buyer storefront: fetch the vendor's DISTINCT tags server-side (P16) so chips
        // reflect ALL of the vendor's products, not just the loaded page.
        const uniqueTags = await fetchStoreTags(stor.id);
        setProductTags(uniqueTags);
      }
    };

    loadProductTags();
  }, [stor?.id, businessProduct, pathname]);

  const filters = ["All", ...productTags];

  return (
    <FilterBar
      className="px-4 md:px-6 lg:px-8 pt-4"
      ariaLabel="Filter products"
      pills={filters}
      activePill={Math.max(0, filters.indexOf(activeFilter))}
      onPillChange={(index) => {
        setActiveFilter(filters[index]);
        onFilterChange(filters[index]);
      }}
      onSortClick={onSortToggle}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
    />
  );
};

export default VendorDataSort;
