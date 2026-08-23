import React from 'react';

interface ComingSoonPillProps {
  className?: string;
}

const ComingSoonPill: React.FC<ComingSoonPillProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
    >
      Soon
    </span>
  );
};

export default ComingSoonPill;
