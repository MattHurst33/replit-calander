import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, ExternalLink, Refresh, Settings, CheckCircle, Calendar, Cloud, Scan, Unlink } from "lucide-react";
import { format } from "date-fns";

interface CalendarIntegration {
  google: {
    connected: boolean;
    lastConnected: string | null;
  };
  outlook: {
    connected: boolean;
    lastConnected: string | null;
  };
  scanStats: {
    lastScan: string | null;
    connectedCalendars: string[];
    totalMeetingsImported: number;
  };
}

export default function CalendarIntegration() {
  const { toast } = useToast();

  // Check for OAuth callback status in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google') === 'success') {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar has been successfully connected.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-integrations'] });
    } else if (urlParams.get('google') === 'error') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('outlook') === 'success') {
      toast({
        title: "Outlook Calendar Connected",
        description: "Your Outlook Calendar has been successfully connected.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-integrations'] });
    } else if (urlParams.get('outlook') === 'error') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Outlook Calendar. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const { data: integrations, isLoading } = useQuery<CalendarIntegration>({
    queryKey: ['/api/calendar-integrations'],
    retry: false
  });

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/google/calendar');
      return response.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate Google Calendar connection",
        variant: "destructive",
      });
    },
  });

  const connectOutlookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/outlook/calendar');
      return response.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate Outlook Calendar connection",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (type: string) => {
      return await apiRequest(`/api/calendar-integrations/${type}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Calendar integration has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect calendar",
        variant: "destructive",
      });
    },
  });

  const scanCalendarsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/scan-calendars', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Scan Completed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan calendars",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading integrations...</div>;
  }

  const currentIntegrations = integrations || {
    google: { connected: false, lastConnected: null },
    outlook: { connected: false, lastConnected: null },
    scanStats: { lastScan: null, connectedCalendars: [], totalMeetingsImported: 0 }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Integration</h1>
          <p className="text-muted-foreground">
            Connect your calendars to automatically import and groom meetings with AI
          </p>
        </div>
      </div>

      {/* Connection Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud size={20} />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentIntegrations.scanStats.connectedCalendars.length}</div>
              <div className="text-sm text-blue-600">Connected Calendars</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentIntegrations.scanStats.totalMeetingsImported}</div>
              <div className="text-sm text-green-600">Meetings Imported</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {currentIntegrations.scanStats.lastScan 
                  ? format(new Date(currentIntegrations.scanStats.lastScan), 'MMM d')
                  : 'Never'
                }
              </div>
              <div className="text-sm text-purple-600">Last Scan</div>
            </div>
          </div>

          {/* Manual Scan Button */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => scanCalendarsMutation.mutate()}
              disabled={scanCalendarsMutation.isPending || currentIntegrations.scanStats.connectedCalendars.length === 0}
              variant="outline"
            >
              {scanCalendarsMutation.isPending ? (
                <>
                  <Refresh className="animate-spin mr-2" size={16} />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="mr-2" size={16} />
                  Scan Calendars Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integrations */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-blue-600" size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg">Google Calendar</CardTitle>
                  <CardDescription>
                    Connect your Google Calendar to import meetings
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={currentIntegrations.google.connected ? "default" : "secondary"}
                className={currentIntegrations.google.connected ? "bg-green-100 text-green-800" : ""}
              >
                {currentIntegrations.google.connected ? <CheckCircle size={12} className="mr-1" /> : null}
                {currentIntegrations.google.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">
                  {currentIntegrations.google.connected ? "Active" : "Not Connected"}
                </span>
              </div>
              {currentIntegrations.google.lastConnected && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Connected:</span>
                  <span className="font-medium">
                    {format(new Date(currentIntegrations.google.lastConnected), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              {currentIntegrations.google.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectMutation.mutate('google_calendar')}
                  disabled={disconnectMutation.isPending}
                  className="flex-1"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={() => connectGoogleMutation.mutate()}
                  disabled={connectGoogleMutation.isPending}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Outlook Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-orange-600" size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg">Outlook Calendar</CardTitle>
                  <CardDescription>
                    Connect your Outlook Calendar to import meetings
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={currentIntegrations.outlook.connected ? "default" : "secondary"}
                className={currentIntegrations.outlook.connected ? "bg-green-100 text-green-800" : ""}
              >
                {currentIntegrations.outlook.connected ? <CheckCircle size={12} className="mr-1" /> : null}
                {currentIntegrations.outlook.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">
                  {currentIntegrations.outlook.connected ? "Active" : "Not Connected"}
                </span>
              </div>
              {currentIntegrations.outlook.lastConnected && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Connected:</span>
                  <span className="font-medium">
                    {format(new Date(currentIntegrations.outlook.lastConnected), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              {currentIntegrations.outlook.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectMutation.mutate('outlook_calendar')}
                  disabled={disconnectMutation.isPending}
                  className="flex-1"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={() => connectOutlookMutation.mutate()}
                  disabled={connectOutlookMutation.isPending}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Outlook Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works Section */}
      <Card>
        <CardHeader>
          <CardTitle>How Calendar Integration Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Connect Your Calendars</p>
                <p>Link your Google Calendar and/or Outlook Calendar using secure OAuth authentication</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Automatic Scanning</p>
                <p>System scans your calendars every 15 minutes for new meetings and events</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">AI Qualification</p>
                <p>Each imported meeting is automatically analyzed and qualified using your custom rules</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Smart Grooming</p>
                <p>Qualified meetings stay, disqualified ones can be automatically removed from your calendar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}