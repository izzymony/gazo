"use client";

interface StoreStatusBadgeProps {
  isActive?: boolean;
  className?: string;
}

const StoreStatusBadge = ({ 
  isActive = true, 
  className = "" 
}: StoreStatusBadgeProps) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isActive ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      <span className={`text-caption font-medium ${
        isActive ? 'text-green-600' : 'text-gray-500'
      }`}>
        {isActive ? 'Live' : 'Inactive'}
      </span>
    </div>
  );
};

export default StoreStatusBadge;