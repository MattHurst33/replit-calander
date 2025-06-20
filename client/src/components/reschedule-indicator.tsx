import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Mail, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface RescheduleIndicatorProps {
  autoRescheduleAttempts?: number;
  lastRescheduleAttempt?: Date | string;
  rescheduleEmailSent?: boolean;
  originalMeetingTime?: Date | string;
  currentMeetingTime?: Date | string;
  className?: string;
}

export function RescheduleIndicator({ 
  autoRescheduleAttempts, 
  lastRescheduleAttempt,
  rescheduleEmailSent,
  originalMeetingTime,
  currentMeetingTime,
  className = "" 
}: RescheduleIndicatorProps) {
  if (!autoRescheduleAttempts || autoRescheduleAttempts === 0) {
    return null;
  }

  const getRescheduleBadge = () => {
    const attempts = autoRescheduleAttempts || 0;
    
    if (attempts === 1) {
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
          <RefreshCw size={12} className="mr-1" />
          Rescheduled
        </Badge>
      );
    } else if (attempts === 2) {
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
          <RefreshCw size={12} className="mr-1" />
          Rescheduled 2x
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 text-xs">
          <AlertCircle size={12} className="mr-1" />
          Multiple Reschedules
        </Badge>
      );
    }
  };

  const getTooltipContent = () => {
    let content = `Reschedule Attempts: ${autoRescheduleAttempts}`;
    
    if (lastRescheduleAttempt) {
      const lastAttempt = new Date(lastRescheduleAttempt);
      content += `\nLast attempt: ${format(lastAttempt, 'MMM d, yyyy h:mm a')}`;
    }
    
    if (rescheduleEmailSent) {
      content += '\nReschedule email sent: Yes';
    } else {
      content += '\nReschedule email sent: No';
    }
    
    if (originalMeetingTime && currentMeetingTime) {
      const original = new Date(originalMeetingTime);
      const current = new Date(currentMeetingTime);
      
      if (original.getTime() !== current.getTime()) {
        content += `\n\nOriginal time: ${format(original, 'MMM d, yyyy h:mm a')}`;
        content += `\nCurrent time: ${format(current, 'MMM d, yyyy h:mm a')}`;
      }
    }
    
    return content;
  };

  const showWarning = autoRescheduleAttempts >= 2;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-2 ${className}`}>
            {showWarning && (
              <AlertCircle size={14} className="text-amber-500" />
            )}
            {getRescheduleBadge()}
            {rescheduleEmailSent && (
              <Mail size={12} className="text-blue-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="whitespace-pre-line text-sm">
            {getTooltipContent()}
            {showWarning && (
              <>
                {'\n\n'}
                <span className="text-amber-600 font-medium">
                  ⚠️ Multiple reschedule attempts - consider manual follow-up
                </span>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}