import React from 'react';

// H1 component matching main app - font-500, text-[24px], specific text color
const H1 = ({ children, className = "", ...props }: { 
  className?: string, 
  children: React.ReactNode 
}) => {
  return (
    <h1 className={`font-[500] text-[24px] text-center text-gray-900 tracking-[0px] ${className}`} {...props}>
      {children}
    </h1>
  );
};

// H2 component for admin sections
const H2 = ({ children, className = "", ...props }: { 
  className?: string, 
  children: React.ReactNode 
}) => {
  return (
    <h2 className={`font-[500] text-[20px] text-gray-900 tracking-[0px] ${className}`} {...props}>
      {children}
    </h2>
  );
};

// H3 component for sub-sections
const H3 = ({ children, className = "", ...props }: { 
  className?: string, 
  children: React.ReactNode 
}) => {
  return (
    <h3 className={`font-[500] text-[18px] text-gray-900 tracking-[0px] ${className}`} {...props}>
      {children}
    </h3>
  );
};

// Body text component
const Text = ({ children, className = "", variant = "default", ...props }: { 
  className?: string, 
  children: React.ReactNode,
  variant?: "default" | "muted" | "small" | "large"
}) => {
  const variantClasses = {
    default: "text-[14px] text-gray-700",
    muted: "text-[14px] text-gray-500",
    small: "text-[12px] text-gray-600",
    large: "text-[16px] text-gray-700"
  };

  return (
    <p className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </p>
  );
};

// Label component for forms
const Label = ({ children, className = "", required = false, ...props }: { 
  className?: string, 
  children: React.ReactNode,
  required?: boolean
}) => {
  return (
    <label className={`block text-[14px] font-medium text-gray-700 ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''} ${className}`} {...props}>
      {children}
    </label>
  );
};

export { H1, H2, H3, Text, Label };
export default H1;