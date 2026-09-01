"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardContent } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { H3, Text } from "@/components/common/Typography";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import {
  Users,
  UserCheck,
  UserX,
  Key,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShoppingBag,
  Store,
  Loader2,
  AlertTriangle,
  Edit,
  Trash2,
  MessageCircle,
  Package
} from "lucide-react";
import { useUsers } from "@/hooks/api/useApiClient";
import { useRouter } from "next/navigation";
import DropdownMenu from "@/components/common/DropdownMenu";
import { toast } from "sonner";
import SidePanel from "@/components/common/SidePanel";
import UserDetailView from "@/components/detail-views/UserDetailView";
import { useDetailPanel } from "@/hooks/useDetailPanel";

interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  user_name: string;
  created_at: string;
  business: any;
  profile_image?: string;
  auth_type: string;
}

export default function UsersPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const { loading, error, getUsers, deleteUser } = useUsers();
  const router = useRouter();
  const { isOpen, type, id, openPanel, closePanel } = useDetailPanel();

  const fetchUsers = async (page = 1, search = "") => {
    const result = await getUsers(page, 20, search);
    console.log('API Response:', result);
    if (result && result.data) {
      console.log('result.data:', result.data);
      console.log('result.data.data:', result.data.data);
      console.log('result.page:', result.page);
      console.log('result.total:', result.total);
      
      // Backend returns: { data: { message: "successful", data: [...users...] }, page, limit, total, totalPages }
      // From console: result.data.data contains Array(20) of users
      const usersData = Array.isArray(result.data.data) ? result.data.data : [];
      console.log('Extracted users:', usersData);
      setUsers(usersData);
      setPagination({
        current_page: result.page || 1,
        total_pages: result.totalPages || 1,
        total_count: result.total || 0,
        per_page: result.limit || 20
      });
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, searchTerm);
  }, [currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1, searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "vendor") return user.business !== null;
    if (selectedFilter === "buyer") return user.business === null;
    return true;
  }) : [];

  const getUserType = (user: User) => {
    return user.business ? "vendor" : "buyer";
  };

  const getUserStats = () => {
    const safeUsers = Array.isArray(users) ? users : [];
    const totalUsers = safeUsers.length;
    const buyers = safeUsers.filter(user => !user.business).length;
    const vendors = safeUsers.filter(user => user.business).length;

    return {
      total: pagination?.total_count || totalUsers,
      buyers,
      vendors,
      active: safeUsers.length // All users are considered active for now
    };
  };

  const stats = getUserStats();

  const getStatusBadge = (user: User) => {
    // For now, we'll consider all users as active since API doesn't provide status
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Action handlers
  // R9: enable/disable user is not backed — the User model has no status column,
  // so the old call (updateUser({status})) hit a non-existent column and always
  // 500'd while showing a "Suspending…" spinner. The control is disabled in the
  // UI; this stays an honest no-op (no fake success, no guaranteed-500 call).
  const handleToggleUserStatus = (_user: User) => {
    toast('User enable/disable is not available yet');
  };

  // R9: no reset-password backend — control is disabled. Honest no-op (was a
  // fake "Password reset email sent" success toast).
  const handleResetPassword = (_user: User) => {
    toast('Password reset is not available yet');
  };

  const handleEditUser = (userId: string) => {
    router.push(`/users/${userId}/edit`);
  };

  const handleViewUserOrders = (userId: string) => {
    router.push(`/orders?userId=${userId}`);
  };

  const handleViewBusiness = (businessId: string) => {
    router.push(`/businesses/${businessId}`);
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.firstname} ${user.lastname}?`)) {
      toast.promise(
        deleteUser(user.id),
        {
          loading: 'Deleting user...',
          success: 'User deleted successfully',
          error: 'Failed to delete user'
        }
      );
      fetchUsers(currentPage, searchTerm);
    }
  };

  const handleSendMessage = (user: User) => {
    // Open messaging modal or redirect to messages
    toast.info('Messaging feature coming soon');
  };

  const handleRowClick = (userId: string) => {
    openPanel('user', userId);
  };

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brandDeep" />
            <Text>Loading users...</Text>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && users.length === 0) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <H3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Users</H3>
            <Text className="text-gray-600 mb-4">{error}</Text>
            <button
              onClick={() => fetchUsers(currentPage, searchTerm)}
              className="px-4 py-2 bg-brand text-brandInk rounded-lg hover:bg-brandDark transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">

        {/* User Statistics Section */}
        <Section>
          <SectionHeader
            title="User Management"
            description="Monitor and manage all platform users and vendors"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={stats.total.toLocaleString()}
              change="+Live Data"
              changeType="neutral"
              icon={Users}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Buyers"
              value={stats.buyers.toLocaleString()}
              change="+Live Data"
              changeType="neutral"
              icon={ShoppingBag}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Vendors"
              value={stats.vendors.toLocaleString()}
              change="+Live Data"
              changeType="neutral"
              icon={Store}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Active Users"
              value={stats.active.toLocaleString()}
              change="+Live Data"
              changeType="neutral"
              icon={Shield}
              iconColor="text-orange-500"
            />
          </div>
        </Section>

        {/* User List Section */}
        <Section>
          <Card padding={false}>
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <H3 className="text-lg font-semibold text-gray-900">All Users</H3>
                  <Text className="text-sm text-gray-600 mt-1">
                    {pagination && `Showing ${pagination.current_page} of ${pagination.total_pages} pages (${pagination.total_count} total users)`}
                  </Text>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search users..."
                    className="w-full sm:w-64"
                  />

                  <FilterTabs
                    filters={[
                      { key: "all", label: "All Users" },
                      { key: "buyer", label: "Buyers" },
                      { key: "vendor", label: "Vendors" }
                    ]}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                  />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(user.id)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand to-brandLight flex items-center justify-center">
                                <span className="text-brandInk font-medium text-sm">
                                  {user.firstname.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstname} {user.lastname}
                              </div>
                              <div className="text-sm text-gray-500">@{user.user_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUserType(user) === "vendor"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                            }`}>
                            {getUserType(user) === "vendor" ? (
                              <>
                                <Store className="w-3 h-3 mr-1" />
                                Vendor
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3 h-3 mr-1" />
                                Buyer
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-3 h-3 mr-2 text-gray-400" />
                              {user.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-3 h-3 mr-2 text-gray-400" />
                              {user.phone}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(user)}
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            {/* Primary Action: Enable/Disable — disabled (no backend:
                                the User model has no status column, so the call 500s). R9 */}
                            <button
                              disabled
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                              title="Not available yet"
                            >
                              {user.business ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            
                            {/* Secondary Action: Reset Password — disabled (no backend) */}
                            <button
                              onClick={() => handleResetPassword(user)}
                              disabled
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                              title="Not available yet"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            
                            {/* More Actions Menu */}
                            <DropdownMenu
                              items={[
                                {
                                  label: 'Edit Profile',
                                  icon: <Edit className="h-4 w-4" />,
                                  onClick: () => handleEditUser(user.id)
                                },
                                {
                                  label: 'View Orders',
                                  icon: <Package className="h-4 w-4" />,
                                  onClick: () => handleViewUserOrders(user.id)
                                },
                                ...(user.business ? [{
                                  label: 'View Business',
                                  icon: <Store className="h-4 w-4" />,
                                  onClick: () => handleViewBusiness(user.business.id || '')
                                }] : []),
                                {
                                  // No backend messaging — disabled so it can't imply a message was sent.
                                  label: 'Send Message',
                                  icon: <MessageCircle className="h-4 w-4" />,
                                  onClick: () => handleSendMessage(user),
                                  disabled: true
                                },
                                {
                                  label: 'Delete User',
                                  icon: <Trash2 className="h-4 w-4" />,
                                  onClick: () => handleDeleteUser(user),
                                  variant: 'danger' as const,
                                  divider: true
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
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Text className="text-sm text-gray-700">
                Showing page {pagination.current_page} of {pagination.total_pages}
              </Text>
              <div className="flex gap-2">
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                  disabled={currentPage === pagination.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-brandDeep" />
            </div>
          )}
        </Section>
      </div>

      {/* User Detail Side Panel */}
      <SidePanel
        isOpen={isOpen && type === 'user'}
        onClose={closePanel}
        title="User Details"
        subtitle={id ? `User ID: ${id}` : undefined}
        fullPageUrl={id ? `/users/${id}` : undefined}
        width="wide"
      >
        {id && <UserDetailView userId={id} onClose={closePanel} />}
      </SidePanel>
    </AdminLayout>
  );
}