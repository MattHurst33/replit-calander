import { ExternalLink, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Meeting } from "@shared/schema";

interface MeetingCardProps {
  meeting: Meeting;
  onUpdate?: (id: number, status: string) => void;
}

export default function MeetingCard({ meeting, onUpdate }: MeetingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'border-green-200 bg-green-50';
      case 'disqualified':
        return 'border-red-200 bg-red-50';
      case 'needs_review':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qualified':
        return <Badge className="bg-green-100 text-green-800">Qualified</Badge>;
      case 'disqualified':
        return <Badge className="bg-red-100 text-red-800">Disqualified</Badge>;
      case 'needs_review':
        return <Badge className="bg-amber-100 text-amber-800">Needs Review</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">Pending</Badge>;
    }
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'w-3 h-3 bg-green-500 rounded-full';
      case 'disqualified':
        return 'w-3 h-3 bg-red-500 rounded-full';
      case 'needs_review':
        return 'w-3 h-3 bg-amber-500 rounded-full';
      default:
        return 'w-3 h-3 bg-slate-500 rounded-full';
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${getStatusColor(meeting.status)}`}>
      <div className="flex items-center space-x-4">
        <div className={getStatusDot(meeting.status)}></div>
        <div>
          <h4 className="font-medium text-slate-900">{meeting.title}</h4>
          <p className="text-sm text-slate-600">
            {formatDateTime(meeting.startTime)} - {formatDateTime(meeting.endTime)}
          </p>
          <div className="flex items-center space-x-4 mt-2">
            {getStatusBadge(meeting.status)}
            {meeting.revenue && (
              <span className="text-xs text-slate-500">
                Revenue: ${Number(meeting.revenue).toLocaleString()}
              </span>
            )}
            {meeting.companySize && (
              <span className="text-xs text-slate-500">
                Company: {meeting.companySize} employees
              </span>
            )}
          </div>
          {meeting.qualificationReason && (
            <p className="text-xs text-slate-500 mt-1">
              {meeting.qualificationReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <ExternalLink size={16} />
        </Button>
        {meeting.status === 'disqualified' && (
          <Button variant="ghost" size="sm">
            <EyeOff size={16} />
          </Button>
        )}
        <Button variant="ghost" size="sm">
          <MoreHorizontal size={16} />
        </Button>
      </div>
    </div>
  );
}
