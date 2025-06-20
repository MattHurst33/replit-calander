import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, HelpCircle, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { InviteAcceptanceIndicator } from "@/components/invite-acceptance-indicator";
import type { Meeting } from "@shared/schema";

interface InviteStats {
  totalMeetings: number;
  invitesAccepted: number;
  invitesPending: number;
  invitesDeclined: number;
  invitesUnknown: number;
  acceptanceRate: number;
  lastChecked: string | null;
}

export default function InviteTracking() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<InviteStats>({
    queryKey: ['/api/invite-tracking/stats'],
    retry: false
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    retry: false
  });

  const checkInvitesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/invite-tracking/check', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Check Completed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invite-tracking/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check invite statuses",
        variant: "destructive",
      });
    },
  });

  const currentStats = stats || {
    totalMeetings: 0,
    invitesAccepted: 0,
    invitesPending: 0,
    invitesDeclined: 0,
    invitesUnknown: 0,
    acceptanceRate: 0,
    lastChecked: null
  };

  // Filter meetings to show only recent ones with invite data
  const recentMeetings = meetings?.filter(meeting => {
    const meetingDate = new Date(meeting.dateTime);
    const now = new Date();
    const daysDiff = (now.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30; // Show meetings from last 30 days
  }).slice(0, 10) || [];

  // Get at-risk meetings (declined or pending for too long)
  const atRiskMeetings = recentMeetings.filter(meeting => {
    if (meeting.inviteStatus === 'declined') return true;
    if (meeting.inviteStatus === 'pending' && meeting.inviteLastChecked) {
      const daysSinceCheck = (new Date().getTime() - new Date(meeting.inviteLastChecked).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCheck > 1; // Pending for more than 1 day
    }
    return false;
  });

  if (statsLoading || meetingsLoading) {
    return <div>Loading invite tracking data...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Acceptance Tracking</h1>
          <p className="text-muted-foreground">
            Monitor prospect commitment by tracking meeting invitation responses
          </p>
        </div>
        <Button
          onClick={() => checkInvitesMutation.mutate()}
          disabled={checkInvitesMutation.isPending}
          variant="outline"
        >
          {checkInvitesMutation.isPending ? (
            <>
              <RefreshCw className="animate-spin mr-2" size={16} />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2" size={16} />
              Check Invites Now
            </>
          )}
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">{currentStats.totalMeetings}</p>
              </div>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{currentStats.invitesAccepted}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{currentStats.invitesPending}</p>
              </div>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Declined</p>
                <p className="text-2xl font-bold text-red-600">{currentStats.invitesDeclined}</p>
              </div>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold">{currentStats.acceptanceRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Meetings Alert */}
      {atRiskMeetings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={20} />
              At-Risk Meetings ({atRiskMeetings.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              These meetings have declined invitations or pending responses for too long
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium">{meeting.attendeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meeting.dateTime), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <InviteAcceptanceIndicator
                    inviteStatus={meeting.inviteStatus}
                    inviteAccepted={meeting.inviteAccepted}
                    inviteLastChecked={meeting.inviteLastChecked}
                    attendeeResponses={meeting.attendeeResponses}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Meetings with Invite Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Meetings - Invite Status</CardTitle>
          <CardDescription>
            Monitor invitation responses for your recent meetings
            {currentStats.lastChecked && (
              <span className="block mt-1 text-xs">
                Last checked: {format(new Date(currentStats.lastChecked), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMeetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent meetings found
            </p>
          ) : (
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{meeting.attendeeName}</p>
                    <p className="text-sm text-muted-foreground">{meeting.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meeting.dateTime), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={
                        meeting.qualificationStatus === 'qualified' ? 'default' : 
                        meeting.qualificationStatus === 'disqualified' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {meeting.qualificationStatus}
                    </Badge>
                    <InviteAcceptanceIndicator
                      inviteStatus={meeting.inviteStatus}
                      inviteAccepted={meeting.inviteAccepted}
                      inviteLastChecked={meeting.inviteLastChecked}
                      attendeeResponses={meeting.attendeeResponses}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Invite Tracking Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Automatic Monitoring</p>
                <p>System checks calendar invitations every 30 minutes for acceptance status</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Commitment Signals</p>
                <p>Tracks whether prospects have accepted, declined, or left invitations pending</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Risk Assessment</p>
                <p>Identifies at-risk meetings based on invite response patterns</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Early Warnings</p>
                <p>Provides alerts for meetings with declined or long-pending invitations</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}