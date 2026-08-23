"use client";

import { useEffect, useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  Store, 
  Shield,
  Activity,
  Clock,
  DollarSign,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { H3, Text } from '@/components/common/Typography';
import { useUsers } from '@/hooks/api/useApiClient';

interface UserDetailViewProps {
  userId: string;
  onClose: () => void;
}

export default function UserDetailView({ userId }: UserDetailViewProps) {
  const [user, setUser] = useState<any>(null);
  const { loading, error, getUser } = useUsers();

  useEffect(() => {
    const fetchUser = async () => {
      const result = await getUser(userId);
      if (result && result.data) {
        setUser(result.data);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, getUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <Text className="text-gray-600">Loading user details...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <Text>Error loading user details: {error}</Text>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Text className="text-gray-600">User not found</Text>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (user: any) => {
    const isActive = !user.deleted_at;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Suspended'}
      </span>
    );
  };

  const getUserInitials = (firstname: string, lastname: string) => {
    return `${firstname?.charAt(0) || ''}${lastname?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* User Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.profile_image ? (
                <img 
                  src={user.profile_image} 
                  alt={`${user.firstname} ${user.lastname}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-instaRed to-instaRedLight flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {getUserInitials(user.firstname, user.lastname)}
                  </span>
                </div>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <H3 className="text-xl font-semibold text-gray-900 truncate">
                  {user.firstname} {user.lastname}
                </H3>
                {getStatusBadge(user)}
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Text>{user.email}</Text>
                </div>
                
                {user.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Text>{user.phone}</Text>
                  </div>
                )}
                
                {user.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <Text className="truncate">{user.address}</Text>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Text>Member since {formatDate(user.created_at)}</Text>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mx-auto mb-2">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <Text className="text-2xl font-bold text-gray-900">0</Text>
            <Text className="text-sm text-gray-600">Orders</Text>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mx-auto mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <Text className="text-2xl font-bold text-gray-900">₦0</Text>
            <Text className="text-sm text-gray-600">Total Spent</Text>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <H3 className="text-lg font-medium">Account Information</H3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Text className="text-sm font-medium text-gray-500">User ID</Text>
              <Text className="mt-1 font-mono text-sm">{user.id}</Text>
            </div>
            
            <div>
              <Text className="text-sm font-medium text-gray-500">Authentication</Text>
              <div className="mt-1 flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <Text className="text-sm capitalize">{user.auth_type || 'Email'}</Text>
              </div>
            </div>
            
            <div>
              <Text className="text-sm font-medium text-gray-500">Last Updated</Text>
              <div className="mt-1 flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <Text className="text-sm">{formatDate(user.updated_at)}</Text>
              </div>
            </div>
            
            {user.deleted_at && (
              <div>
                <Text className="text-sm font-medium text-red-500">Suspended</Text>
                <div className="mt-1 flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-red-400" />
                  <Text className="text-sm text-red-600">{formatDate(user.deleted_at)}</Text>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Information (if applicable) */}
      {user.business && (
        <Card>
          <CardHeader>
            <H3 className="text-lg font-medium">Business Information</H3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Text className="font-medium">{user.business.name}</Text>
                <Text className="text-sm text-gray-600">{user.business.category}</Text>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <H3 className="text-lg font-medium">Recent Activity</H3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <Text>No recent activity</Text>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}