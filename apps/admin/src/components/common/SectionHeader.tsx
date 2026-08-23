interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}