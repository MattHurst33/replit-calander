import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Calendar, AlertTriangle, RefreshCw, BarChart } from "lucide-react";

interface CalendarCleanupSettings {
  autoDeleteDisqualified: boolean;
  notifyCalendarDeletions: boolean;
  cleanupDelayMinutes: number;
}

interface CleanupStats {
  totalDisqualified: number;
  deletedFromCalendar: number;
  pendingDeletion: number;
}

export default function CalendarCleanupSettings() {
  const { toast } = useToast();
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  const { data: settings, isLoading } = useQuery<CalendarCleanupSettings>({
    queryKey: ['/api/settings/calendar-cleanup'],
    retry: false
  });

  const { data: stats } = useQuery<CleanupStats>({
    queryKey: ['/api/calendar-cleanup-stats'],
    retry: false
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<CalendarCleanupSettings>) => {
      return await apiRequest('/api/settings/calendar-cleanup', {
        method: 'PATCH',
        body: JSON.stringify(newSettings)
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Calendar cleanup settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/calendar-cleanup'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const manualCleanupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/manual-calendar-cleanup', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup completed",
        description: `${data.deleted} disqualified meetings deleted from calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-cleanup-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup failed",
        description: error.message || "Failed to run calendar cleanup",
        variant: "destructive",
      });
    },
  });

  const handleManualCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      await manualCleanupMutation.mutateAsync();
    } finally {
      setIsRunningCleanup(false);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  const currentSettings = settings || {
    autoDeleteDisqualified: false,
    notifyCalendarDeletions: true,
    cleanupDelayMinutes: 5
  };

  const currentStats = stats || {
    totalDisqualified: 0,
    deletedFromCalendar: 0,
    pendingDeletion: 0
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 size={20} />
            Calendar Cleanup Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-delete toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoDelete">Auto-delete Disqualified Meetings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically remove disqualified leads from your calendar to stay focused
              </p>
            </div>
            <Switch
              id="autoDelete"
              checked={currentSettings.autoDeleteDisqualified}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ autoDeleteDisqualified: checked });
              }}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          {/* Notification settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when meetings are deleted from your calendar
              </p>
            </div>
            <Switch
              id="notifications"
              checked={currentSettings.notifyCalendarDeletions}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ notifyCalendarDeletions: checked });
              }}
              disabled={!currentSettings.autoDeleteDisqualified || updateSettingsMutation.isPending}
            />
          </div>

          {/* Cleanup delay */}
          <div className="space-y-2">
            <Label htmlFor="delay">Cleanup Delay (minutes)</Label>
            <p className="text-sm text-muted-foreground">
              Wait time before deleting disqualified meetings from calendar
            </p>
            <Input
              id="delay"
              type="number"
              min="0"
              max="1440"
              value={currentSettings.cleanupDelayMinutes}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                updateSettingsMutation.mutate({ cleanupDelayMinutes: value });
              }}
              disabled={!currentSettings.autoDeleteDisqualified || updateSettingsMutation.isPending}
              className="w-32"
            />
          </div>

          {/* Warning notice */}
          {currentSettings.autoDeleteDisqualified && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Important Notice</p>
                <p className="text-yellow-700 mt-1">
                  Meetings marked as disqualified will be automatically removed from your calendar. 
                  This action cannot be undone. Consider the cleanup delay setting to prevent accidental deletions.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart size={20} />
            Cleanup Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{currentStats.totalDisqualified}</div>
              <div className="text-sm text-gray-600">Total Disqualified</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{currentStats.deletedFromCalendar}</div>
              <div className="text-sm text-red-600">Deleted from Calendar</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{currentStats.pendingDeletion}</div>
              <div className="text-sm text-orange-600">Pending Deletion</div>
            </div>
          </div>

          {/* Manual cleanup button */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Manual Cleanup</h4>
                <p className="text-sm text-muted-foreground">
                  Immediately clean up all disqualified meetings from your calendar
                </p>
              </div>
              <Button
                onClick={handleManualCleanup}
                disabled={isRunningCleanup || manualCleanupMutation.isPending || currentStats.pendingDeletion === 0}
                variant="outline"
              >
                {isRunningCleanup ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2" size={16} />
                    Clean Now
                  </>
                )}
              </Button>
            </div>
            
            {currentStats.pendingDeletion === 0 && (
              <p className="text-sm text-green-600 mt-2">
                No disqualified meetings pending deletion
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How Calendar Cleanup Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Qualification Check</p>
                <p>AI automatically qualifies or disqualifies leads based on your criteria</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Cleanup Delay</p>
                <p>System waits for the specified delay period before deleting disqualified meetings</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Calendar Deletion</p>
                <p>Disqualified meetings are removed from your calendar and marked as cancelled</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Notification</p>
                <p>You receive an email notification about deleted meetings (if enabled)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}