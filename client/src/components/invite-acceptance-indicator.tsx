import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Clock, XCircle, HelpCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface InviteAcceptanceIndicatorProps {
  inviteStatus?: string;
  inviteAccepted?: boolean;
  inviteLastChecked?: Date | string;
  attendeeResponses?: Array<{
    email: string;
    name?: string;
    status: string;
    responseTime?: Date | string;
  }>;
  className?: string;
}

export function InviteAcceptanceIndicator({ 
  inviteStatus, 
  inviteAccepted, 
  inviteLastChecked,
  attendeeResponses,
  className = "" 
}: InviteAcceptanceIndicatorProps) {
  const getStatusIcon = () => {
    switch (inviteStatus) {
      case 'accepted':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'declined':
        return <XCircle size={14} className="text-red-600" />;
      case 'pending':
        return <Clock size={14} className="text-yellow-600" />;
      default:
        return <HelpCircle size={14} className="text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (!inviteStatus || inviteStatus === 'unknown') {
      return (
        <Badge variant="secondary" className="text-xs">
          <HelpCircle size={12} className="mr-1" />
          Unknown
        </Badge>
      );
    }

    switch (inviteStatus) {
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
            <CheckCircle size={12} className="mr-1" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle size={12} className="mr-1" />
            Declined
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-300 text-yellow-700 text-xs">
            <Clock size={12} className="mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <HelpCircle size={12} className="mr-1" />
            {inviteStatus}
          </Badge>
        );
    }
  };

  const getTooltipContent = () => {
    let content = `Invite Status: ${inviteStatus || 'Unknown'}`;
    
    if (inviteLastChecked) {
      const lastChecked = new Date(inviteLastChecked);
      content += `\nLast checked: ${format(lastChecked, 'MMM d, yyyy h:mm a')}`;
    }
    
    if (attendeeResponses && attendeeResponses.length > 0) {
      content += '\n\nAttendee Responses:';
      attendeeResponses.forEach(response => {
        content += `\n• ${response.name || response.email}: ${response.status}`;
        if (response.responseTime) {
          content += ` (${format(new Date(response.responseTime), 'MMM d, h:mm a')})`;
        }
      });
    }
    
    return content;
  };

  const showWarning = inviteStatus === 'declined' || 
    (inviteStatus === 'pending' && inviteLastChecked && 
     new Date().getTime() - new Date(inviteLastChecked).getTime() > 24 * 60 * 60 * 1000); // 24 hours

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-2 ${className}`}>
            {showWarning && (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
            {getStatusBadge()}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="whitespace-pre-line text-sm">
            {getTooltipContent()}
            {showWarning && (
              <>
                {'\n\n'}
                <span className="text-amber-600 font-medium">
                  ⚠️ Risk: Invite not accepted - may be a no-show
                </span>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}