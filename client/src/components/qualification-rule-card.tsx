import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { QualificationRule } from "@shared/schema";

interface QualificationRuleCardProps {
  rule: QualificationRule;
  onEdit?: (rule: QualificationRule) => void;
  onDelete?: (id: number) => void;
}

export default function QualificationRuleCard({ rule, onEdit, onDelete }: QualificationRuleCardProps) {
  const getRuleColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-50 border-green-200' 
      : 'bg-gray-50 border-gray-200';
  };

  const formatCondition = () => {
    const operators = {
      'gte': '>=',
      'lte': '<=',
      'eq': '=',
      'ne': '!=',
      'contains': 'contains',
      'not_contains': 'does not contain'
    };
    
    return `${operators[rule.operator as keyof typeof operators] || rule.operator} ${rule.value}`;
  };

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${getRuleColor(rule.isActive)}`}>
      <div>
        <p className="text-sm font-medium text-slate-900">{rule.name}</p>
        <p className="text-xs text-slate-700">{formatCondition()}</p>
        <div className="mt-2 flex items-center space-x-2">
          <Badge variant={rule.isActive ? "default" : "secondary"}>
            {rule.isActive ? "Active" : "Inactive"}
          </Badge>
          <span className="text-xs text-slate-500">Priority: {rule.priority}</span>
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
    </div>
  );
}
