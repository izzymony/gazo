"use client";

import { Shield, User } from "lucide-react";
import useAdminAuthStore from "@/store/adminAuthStore";

export default function RoleIndicator() {
  const { admin } = useAdminAuthStore();

  if (!admin) return null;

  const isAdmin = admin.role === 'admin';

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
      <div className={`flex items-center px-4 py-2 rounded-xl shadow-soft border-2 ${
        isAdmin 
          ? 'bg-gradient-to-r from-brand/10 to-brandLight/10 border-brandDeep/30 text-brandDeep' 
          : 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-700'
      }`}>
        {isAdmin ? (
          <Shield className="h-4 w-4 mr-2" />
        ) : (
          <User className="h-4 w-4 mr-2" />
        )}
        <span className="text-sm font-semibold">
          {isAdmin ? 'Admin Role' : 'Operations Role'}
        </span>
        <span className="ml-2 text-xs font-medium opacity-80">
          (Demo Mode)
        </span>
      </div>
    </div>
  );
}