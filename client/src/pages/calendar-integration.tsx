import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CalendarIntegration() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
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

  const connectGoogle = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/auth/google');
      const { authUrl } = await response.json();
      window.open(authUrl, '_blank', 'width=500,height=600');
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendar Integration</h1>
          <p className="text-sm text-slate-600 mt-1">Connect your calendar services to automatically sync meetings</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 3h-15C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>Google Calendar</CardTitle>
                  <p className="text-sm text-slate-600">Sync meetings from your Google Calendar</p>
                </div>
              </div>
              <Badge variant={stats?.integrations?.googleCalendar ? "default" : "secondary"}>
                {stats?.integrations?.googleCalendar ? "Connected" : "Not Connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.integrations?.googleCalendar ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Successfully connected to Google Calendar</span>
                </div>
                
                <div className="flex items-center space-x-4">
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
                  <Button variant="outline">
                    <ExternalLink className="mr-2" size={16} />
                    View in Google Calendar
                  </Button>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Sync Settings</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Automatic sync every 15 minutes</li>
                    <li>• Color-coding based on qualification status</li>
                    <li>• Sync meetings from past 30 days and future 90 days</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <AlertCircle size={16} />
                  <span>Connect your Google Calendar to automatically sync meetings</span>
                </div>

                <Button 
                  onClick={connectGoogle}
                  disabled={isConnecting}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  {isConnecting ? (
                    <RefreshCw className="mr-2 animate-spin" size={16} />
                  ) : (
                    <ExternalLink className="mr-2" size={16} />
                  )}
                  Connect Google Calendar
                </Button>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What happens when you connect?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Read your calendar events to identify sales meetings</li>
                    <li>• Automatically qualify meetings based on your rules</li>
                    <li>• Color-code events: Green (qualified), Red (disqualified), Yellow (needs review)</li>
                    <li>• Sync happens automatically every 15 minutes</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendly Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-orange-600" size={20} />
                </div>
                <div>
                  <CardTitle>Calendly</CardTitle>
                  <p className="text-sm text-slate-600">Capture form data from Calendly bookings</p>
                </div>
              </div>
              <Badge variant={stats?.integrations?.calendly ? "default" : "secondary"}>
                {stats?.integrations?.calendly ? "Connected" : "Not Connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.integrations?.calendly ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Webhook configured and receiving data</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Webhook Configuration</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Webhook URL: {window.location.origin}/api/webhooks/calendly</li>
                    <li>• Events: invitee.created, invitee.canceled</li>
                    <li>• Scope: Organization</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <AlertCircle size={16} />
                  <span>Configure Calendly webhook to capture form data automatically</span>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Setup Instructions</h4>
                  <ol className="text-sm text-orange-800 space-y-2 list-decimal list-inside">
                    <li>Go to your Calendly account settings</li>
                    <li>Navigate to Integrations → Webhooks</li>
                    <li>Add webhook URL: <code className="bg-white px-1 rounded">{window.location.origin}/api/webhooks/calendly</code></li>
                    <li>Select events: invitee.created, invitee.canceled</li>
                    <li>Set scope to Organization</li>
                  </ol>
                </div>

                <Button variant="outline">
                  <ExternalLink className="mr-2" size={16} />
                  Open Calendly Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
                <p className="text-sm text-slate-600">Total Meetings</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats?.qualified || 0}</p>
                <p className="text-sm text-slate-600">Auto-Qualified</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{stats?.needsReview || 0}</p>
                <p className="text-sm text-slate-600">Need Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
