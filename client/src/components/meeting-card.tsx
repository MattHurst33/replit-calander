import { ExternalLink, MoreHorizontal, Eye, EyeOff, Mail, CheckCircle, RefreshCw, CalendarX, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Meeting } from "@shared/schema";

interface MeetingCardProps {
  meeting: Meeting;
  onUpdate?: (id: number, status: string) => void;
}

export default function MeetingCard({ meeting, onUpdate }: MeetingCardProps) {
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isFreeingSlot, setIsFreeingSlot] = useState(false);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);

  const sendConfirmationEmail = async () => {
    try {
      setIsSendingEmail(true);
      const response = await fetch(`/api/meetings/${meeting.id}/send-confirmation`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Email Sent",
          description: "Confirmation email sent successfully to the prospect.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Email Failed",
          description: error.message || "Failed to send confirmation email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Network error occurred while sending email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const freeCalendarSlot = async () => {
    try {
      setIsFreeingSlot(true);
      const response = await fetch(`/api/meetings/${meeting.id}/free-calendar-slot`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Calendar Slot Freed",
          description: result.message,
        });
        // Trigger a refresh of the meeting data
        if (onUpdate) {
          onUpdate(meeting.id, 'disqualified');
        }
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Free Slot",
          description: error.message || "Failed to free calendar slot.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsFreeingSlot(false);
    }
  };

  const markAsNoShow = async () => {
    try {
      setIsMarkingNoShow(true);
      const response = await fetch(`/api/meetings/${meeting.id}/no-show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'did_not_attend' }),
      });

      if (response.ok) {
        toast({
          title: "Marked as No-Show",
          description: "Meeting has been marked as a no-show for analytics tracking.",
        });
        // Trigger a refresh of the meeting data
        if (onUpdate) {
          onUpdate(meeting.id, 'no_show');
        }
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Mark No-Show",
          description: error.message || "Failed to mark meeting as no-show.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingNoShow(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'border-green-200 bg-green-50';
      case 'disqualified':
        return 'border-red-200 bg-red-50';
      case 'needs_review':
        return 'border-amber-200 bg-amber-50';
      case 'no_show':
        return 'border-purple-200 bg-purple-50';
      case 'completed':
        return 'border-blue-200 bg-blue-50';
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
      case 'no_show':
        return <Badge className="bg-purple-100 text-purple-800">No Show</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
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
      case 'no_show':
        return 'w-3 h-3 bg-purple-500 rounded-full';
      case 'completed':
        return 'w-3 h-3 bg-blue-500 rounded-full';
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
        {meeting.status === 'qualified' && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={sendConfirmationEmail}
            disabled={isSendingEmail}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Send confirmation email"
          >
            {isSendingEmail ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Mail size={16} />
            )}
          </Button>
        )}
        {meeting.externalId && !meeting.externalId.startsWith('calendly_') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={freeCalendarSlot}
            disabled={isFreeingSlot}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Free calendar slot"
          >
            {isFreeingSlot ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <CalendarX size={16} />
            )}
          </Button>
        )}
        {(meeting.status === 'qualified' || meeting.status === 'completed') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={markAsNoShow}
            disabled={isMarkingNoShow}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            title="Mark as no-show"
          >
            {isMarkingNoShow ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <UserX size={16} />
            )}
          </Button>
        )}
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
