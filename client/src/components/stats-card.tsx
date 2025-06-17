import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  iconColor 
}: StatsCardProps) {
  const changeColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-amber-600'
  }[changeType];

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`w-12 h-12 ${iconColor} rounded-lg flex items-center justify-center`}>
            <Icon className="text-current" size={24} />
          </div>
        </div>
        {change && (
          <div className="mt-4 flex items-center space-x-2">
            <span className={`text-sm font-medium ${changeColorClass}`}>
              {change}
            </span>
            <span className="text-sm text-slate-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
