import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/stats-card";
import MeetingCard from "@/components/meeting-card";
import QualificationRuleCard from "@/components/qualification-rule-card";
import { Calendar, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, UserCheck, Settings as SettingsIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Meeting, QualificationRule } from "@shared/schema";

interface DashboardStats {
  total: number;
  qualified: number;
  disqualified: number;
  needsReview: number;
  integrations: {
    googleCalendar: boolean;
    calendly: boolean;
  };
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<QualificationRule[]>({
    queryKey: ['/api/qualification-rules'],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sync/calendar'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Sync Complete",
        description: "Calendar events have been synchronized successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync calendar events. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendReportMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/reports/daily'),
    onSuccess: () => {
      toast({
        title: "Report Sent",
        description: "Daily report has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Report Failed",
        description: "Failed to send daily report. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Sales Pipeline Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Monitor and qualify your sales meetings automatically</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <RefreshCw size={16} />
              <span>Last sync: 2 min ago</span>
            </div>
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {syncMutation.isPending ? (
                <RefreshCw className="mr-2 animate-spin" size={16} />
              ) : (
                <RefreshCw className="mr-2" size={16} />
              )}
              Sync Now
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Meetings"
              value={stats?.total || 0}
              change="+12%"
              changeType="positive"
              icon={Calendar}
              iconColor="bg-blue-50 text-blue-600"
            />
            <StatsCard
              title="Qualified Leads"
              value={stats?.qualified || 0}
              change="+8%"
              changeType="positive"
              icon={CheckCircle}
              iconColor="bg-green-50 text-green-600"
            />
            <StatsCard
              title="Disqualified"
              value={stats?.disqualified || 0}
              change="-3%"
              changeType="positive"
              icon={XCircle}
              iconColor="bg-red-50 text-red-600"
            />
            <StatsCard
              title="Needs Review"
              value={stats?.needsReview || 0}
              change="Review required"
              changeType="neutral"
              icon={AlertTriangle}
              iconColor="bg-amber-50 text-amber-600"
            />
          </>
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Meetings</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <SettingsIcon size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings?.slice(0, 6).map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                  {meetings && meetings.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No meetings found. Connect your calendar to get started.</p>
                    </div>
                  )}
                  <div className="mt-6 text-center">
                    <Button variant="link" className="text-brand-600 hover:text-brand-700">
                      View all meetings →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => {/* TODO: Navigate to manual qualification */}}
                >
                  <div className="flex items-center space-x-3">
                    <UserCheck className="text-brand-500" size={16} />
                    <span>Manual Qualification</span>
                  </div>
                  <span>→</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => {/* TODO: Navigate to rules */}}
                >
                  <div className="flex items-center space-x-3">
                    <SettingsIcon className="text-brand-500" size={16} />
                    <span>Update Rules</span>
                  </div>
                  <span>→</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => sendReportMutation.mutate()}
                  disabled={sendReportMutation.isPending}
                >
                  <div className="flex items-center space-x-3">
                    <Download className="text-brand-500" size={16} />
                    <span>Export Data</span>
                  </div>
                  <span>→</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Qualification Rules */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Rules</CardTitle>
                <Button variant="link" size="sm" className="text-brand-600 hover:text-brand-700">
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {rules?.filter(rule => rule.isActive).slice(0, 3).map((rule) => (
                    <QualificationRuleCard key={rule.id} rule={rule} />
                  ))}
                  {rules?.filter(rule => rule.isActive).length === 0 && (
                    <p className="text-sm text-slate-500">No active rules configured.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.5 3h-15C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Google Calendar</p>
                      <p className={`text-xs ${stats?.integrations.googleCalendar ? 'text-green-600' : 'text-red-600'}`}>
                        {stats?.integrations.googleCalendar ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${stats?.integrations.googleCalendar ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Calendly</p>
                      <p className={`text-xs ${stats?.integrations.calendly ? 'text-green-600' : 'text-red-600'}`}>
                        {stats?.integrations.calendly ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${stats?.integrations.calendly ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
