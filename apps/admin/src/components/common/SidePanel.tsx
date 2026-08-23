"use client";

import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fullPageUrl?: string;
  children: React.ReactNode;
  width?: 'narrow' | 'wide' | 'full';
}

export default function SidePanel({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  fullPageUrl,
  children,
  width = 'wide'
}: SidePanelProps) {
  const router = useRouter();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle full page navigation
  const handleViewFullPage = () => {
    if (fullPageUrl) {
      router.push(fullPageUrl);
      onClose();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Width classes based on size
  const getWidthClasses = () => {
    switch (width) {
      case 'narrow':
        return 'w-full sm:w-96'; // 384px on desktop
      case 'wide':
        return 'w-full sm:w-[600px]'; // 600px on desktop  
      case 'full':
        return 'w-full sm:w-[800px]'; // 800px on desktop
      default:
        return 'w-full sm:w-[600px]';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleOverlayClick}
      />
      
      {/* Side Panel */}
      <div className={`
        absolute right-0 top-0 h-full bg-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        ${getWidthClasses()}
      `}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {/* View Full Page Button */}
              {fullPageUrl && (
                <button
                  onClick={handleViewFullPage}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View full page"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-full pb-16 overflow-y-auto">
          <div className="px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}