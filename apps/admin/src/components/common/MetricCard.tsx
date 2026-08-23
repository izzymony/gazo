import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  icon: LucideIcon;
  iconColor: string;
  onClick?: () => void;
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  iconColor 
}: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getIconBackground = () => {
    if (iconColor.includes('blue')) return 'bg-blue-100';
    if (iconColor.includes('green')) return 'bg-green-100';
    if (iconColor.includes('purple')) return 'bg-purple-100';
    if (iconColor.includes('orange')) return 'bg-orange-100';
    if (iconColor.includes('yellow')) return 'bg-yellow-100';
    if (iconColor.includes('red')) return 'bg-red-100';
    return 'bg-gray-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-soft hover:shadow-md p-4 transition-all border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            <div className={`p-2 rounded-lg ${getIconBackground()}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                changeType === 'increase' 
                  ? 'bg-green-100 text-green-700'
                  : changeType === 'decrease'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {changeType === 'increase' && (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                )}
                {changeType === 'decrease' && (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                  </svg>
                )}
                {change}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}