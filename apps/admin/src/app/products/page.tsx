"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import Button from "@/components/common/Button";
import { H3, Text } from "@/components/common/Typography";
import { 
  Package, 
  MoreHorizontal, 
  Eye, 
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Store,
  Copy,
  MessageCircle,
  Download,
  BarChart
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DropdownMenu, { DropdownMenuItem } from "@/components/common/DropdownMenu";

// Production: No mock data - only real API data

export default function ProductsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    featuredProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await apiClient.getAllProducts(1, 100, searchTerm);

      let products = [];
      let totalCount = 0;

      // Safely extract products from response
      const responseData = response?.data as any;
      if (responseData?.data && Array.isArray(responseData.data)) {
        products = responseData.data;
        totalCount = (response as any).total || products.length;
      }

      if (products.length > 0) {
        setApiProducts(products);

        // Calculate stats from API data
        const active = products.filter((p: any) => p.status === 'active' || p.status === 'ACTIVE').length;
        const outOfStock = products.filter((p: any) => p.stock === 0 || p.quantity === 0).length;
        const featured = products.filter((p: any) => p.featured || p.is_featured).length;

        setApiStats({
          totalProducts: totalCount,
          activeProducts: active,
          outOfStock: outOfStock,
          featuredProducts: featured
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Transform API products to match display structure
  const transformedProducts = apiProducts.map(product => ({
    id: product?.id || '',
    name: product?.title || 'Unknown Product',
    description: product?.description || '',
    price: product?.price || 0,
    originalPrice: product?.old_price && product.old_price > product.price ? product.old_price : product?.price || 0,
    category: product?.category?.name || 'Uncategorized',
    subcategory: product?.sub_category?.name || '',
    business: product?.business_id || 'Direct Sale',
    businessId: product?.business_id || '',
    stock: product?.stock || 0,
    sold: product?.sales || 0,
    rating: product?.product_rating && product.product_rating.length > 0
      ? product.product_rating.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / product.product_rating.length
      : 0,
    reviews: product?.product_rating?.length || 0,
    status: product?.status || 'active',
    featured: product?.featured || false,
    images: product?.image?.length || 0,
    createdDate: product?.created_at || new Date().toISOString(),
    lastUpdated: product?.updated_at || new Date().toISOString()
  }));

  // Production: Use only real API data
  const displayProducts = transformedProducts;
  const displayStats = apiStats;

  const filteredProducts = displayProducts.filter(product => {
    const name = product?.name || '';
    const business = product?.business || '';
    const category = product?.category || '';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === "all" || product?.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "out_of_stock": 
        return "bg-red-100 text-red-800";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "out_of_stock":
        return "Out of Stock";
      case "pending_approval":
        return "Pending Approval";
      case "suspended":
        return "Suspended";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "out_of_stock":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending_approval":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "suspended":
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Action handlers
  const handleApproveRejectProduct = (product: any) => {
    const action = product.status === 'pending_approval' ? 'approve' : 'reject';
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `${action === 'approve' ? 'Approving' : 'Rejecting'} product...`,
        success: `Product ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        error: `Failed to ${action} product`
      }
    );
  };

  const handleFeatureProduct = (product: any) => {
    const isFeatured = product.featured;
    toast.success(`Product ${isFeatured ? 'unfeatured' : 'featured'} successfully`);
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/products/${productId}/edit`);
  };

  const handleViewAnalytics = (productId: string) => {
    router.push(`/analytics/products/${productId}`);
  };

  const handleDuplicateProduct = (product: any) => {
    toast.success('Product duplicated successfully');
  };

  const handleContactVendor = (product: any) => {
    toast.info(`Opening message to ${product.business}`);
  };

  const handleExportProduct = (productId: string) => {
    toast.success('Product data exported');
  };

  const handleDeleteProduct = (product: any) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1000)),
        {
          loading: 'Deleting product...',
          success: 'Product deleted successfully',
          error: 'Failed to delete product'
        }
      );
    }
  };

  const handleRowClick = (productId: string) => {
    // This will open the side panel in Phase 1
    console.log('Open product detail panel:', productId);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* Product Statistics Section */}
        <Section>
          <SectionHeader 
            title="Product Statistics" 
            description="Overview of platform products and inventory metrics"
          >
            <Button variant="filled" size="md" disabled title="Not available yet">
              Export Products
            </Button>
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Products"
              value={displayStats.totalProducts.toString()}
              icon={Package}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Active Products"
              value={displayStats.activeProducts.toString()}
              icon={CheckCircle}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Out of Stock"
              value={displayStats.outOfStock.toString()}
              icon={XCircle}
              iconColor="text-red-500"
            />
            <MetricCard
              title="Pending Approval"
              value="0"
              icon={Clock}
              iconColor="text-yellow-500"
            />
          </div>
        </Section>

        {/* Products Management Section */}
        <Section>
          <Card padding={false}>
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <H3 className="text-lg font-semibold text-gray-900">All Products</H3>
                  <Text className="text-sm text-gray-600 mt-1">
                    {displayProducts.length > 0 ? `Showing ${displayProducts.length} total products` : 'Search, filter, and manage platform products'}
                  </Text>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search products by name, business, or category..."
                    className="w-full sm:w-64"
                  />
                  
                  <FilterTabs
                    filters={[
                      { key: "all", label: "All Products", count: displayProducts.length },
                      { key: "active", label: "Active", count: displayProducts.filter(p => p.status === "active").length },
                      { key: "out_of_stock", label: "Out of Stock", count: displayProducts.filter(p => p.status === "out_of_stock").length },
                      { key: "pending_approval", label: "Pending", count: displayProducts.filter(p => p.status === "pending_approval").length },
                    ]}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                  />
                </div>
              </div>
            </div>

            {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(product.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                          {product.images > 0 ? (
                            <ImageIcon className="h-6 w-6 text-white" />
                          ) : (
                            <Package className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.featured && (
                              <Star className="h-4 w-4 text-yellow-500 ml-2 fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            {product.category}
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            ₦{product.price.toLocaleString()}
                            {product.originalPrice > product.price && (
                              <span className="text-xs text-gray-400 line-through ml-2">
                                ₦{product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Store className="h-4 w-4 text-purple-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.business}</div>
                          <div className="text-sm text-gray-500">{product.subcategory}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(product.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(product.status)}`}>
                          {getStatusText(product.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="flex items-center">
                          <Package className="h-3 w-3 mr-1 text-blue-500" />
                          {product.stock} in stock
                        </div>
                        <div className="flex items-center mt-1">
                          <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                          {product.sold} sold
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Star className="h-3 w-3 mr-1 text-yellow-500" />
                          {typeof product.rating === 'number' ? product.rating.toFixed(1) : product.rating} ({product.reviews} reviews)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(product.lastUpdated).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        Created {new Date(product.createdDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2 justify-end">
                        {/* Primary Action: Approve/Reject — disabled (no backend) */}
                        <button
                          onClick={() => handleApproveRejectProduct(product)}
                          disabled
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                          title="Not available yet"
                        >
                          {product.status === 'pending_approval' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>

                        {/* Secondary Action: Feature — disabled (no backend) */}
                        <button
                          onClick={() => handleFeatureProduct(product)}
                          disabled
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                          title="Not available yet"
                        >
                          <Star className={`h-4 w-4 ${product.featured ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* More Actions Menu */}
                        <DropdownMenu
                          items={[
                            {
                              label: 'Edit Product Details',
                              icon: <Edit3 className="h-4 w-4" />,
                              onClick: () => handleEditProduct(product.id)
                            },
                            {
                              label: 'View Analytics',
                              icon: <BarChart className="h-4 w-4" />,
                              onClick: () => handleViewAnalytics(product.id)
                            },
                            {
                              // No backend product duplication — disabled.
                              label: 'Duplicate Product',
                              icon: <Copy className="h-4 w-4" />,
                              onClick: () => handleDuplicateProduct(product),
                              disabled: true
                            },
                            {
                              // No backend messaging — disabled.
                              label: 'Contact Vendor',
                              icon: <MessageCircle className="h-4 w-4" />,
                              onClick: () => handleContactVendor(product),
                              disabled: true
                            },
                            {
                              // No backend product export — disabled.
                              label: 'Export Product Data',
                              icon: <Download className="h-4 w-4" />,
                              onClick: () => handleExportProduct(product.id),
                              disabled: true
                            },
                            {
                              // No backend product delete — disabled so it can't imply deletion.
                              label: 'Delete Product',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => handleDeleteProduct(product),
                              variant: 'danger' as const,
                              divider: true,
                              disabled: true
                            }
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredProducts.length}</span> of{" "}
                <span className="font-medium">{filteredProducts.length}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="bordered" size="md">
                  Previous
                </Button>
                <Button variant="filled" size="md">
                  1
                </Button>
                <Button variant="bordered" size="md">
                  Next
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
        </Section>

      </div>
    </AdminLayout>
  );
}