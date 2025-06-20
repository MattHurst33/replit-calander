import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, RefreshCw, Settings } from "lucide-react";

interface AutoRescheduleSettings {
  autoRescheduleEnabled: boolean;
  maxRescheduleAttempts: number;
  rescheduleDaysOut: number;
  includeWeekends: boolean;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  autoRescheduleDelayHours: number;
}

export function AutoRescheduleSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<AutoRescheduleSettings>({
    queryKey: ['/api/settings/auto-reschedule'],
    retry: false
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AutoRescheduleSettings>) => {
      return await apiRequest('/api/settings/auto-reschedule', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Auto-reschedule settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/auto-reschedule'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update auto-reschedule settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (enabled: boolean) => {
    updateSettingsMutation.mutate({ autoRescheduleEnabled: enabled });
  };

  const handleMaxAttemptsChange = async (attempts: number) => {
    updateSettingsMutation.mutate({ maxRescheduleAttempts: attempts });
  };

  const handleDaysOutChange = async (days: number) => {
    updateSettingsMutation.mutate({ rescheduleDaysOut: days });
  };

  const handleWeekendsToggle = async (includeWeekends: boolean) => {
    updateSettingsMutation.mutate({ includeWeekends });
  };

  const handleBusinessHoursChange = async (field: string, value: string) => {
    if (!settings) return;
    
    const updatedBusinessHours = {
      ...settings.businessHours,
      [field]: value
    };
    
    updateSettingsMutation.mutate({ businessHours: updatedBusinessHours });
  };

  const handleDelayHoursChange = async (hours: number) => {
    updateSettingsMutation.mutate({ autoRescheduleDelayHours: hours });
  };

  if (isLoading) {
    return <div>Loading auto-reschedule settings...</div>;
  }

  const currentSettings = settings || {
    autoRescheduleEnabled: false,
    maxRescheduleAttempts: 2,
    rescheduleDaysOut: 7,
    includeWeekends: false,
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC'
    },
    autoRescheduleDelayHours: 2
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw size={20} />
          Auto-Reschedule Settings
        </CardTitle>
        <CardDescription>
          Automatically attempt to reschedule meetings when prospects don't show up
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Enable Auto-Reschedule</Label>
            <div className="text-sm text-muted-foreground">
              Automatically send reschedule emails for no-show meetings
            </div>
          </div>
          <Switch
            checked={currentSettings.autoRescheduleEnabled}
            onCheckedChange={handleToggle}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        {currentSettings.autoRescheduleEnabled && (
          <>
            {/* Max Reschedule Attempts */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Maximum Reschedule Attempts</Label>
              <Select
                value={currentSettings.maxRescheduleAttempts.toString()}
                onValueChange={(value) => handleMaxAttemptsChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select max attempts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 attempt</SelectItem>
                  <SelectItem value="2">2 attempts</SelectItem>
                  <SelectItem value="3">3 attempts</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How many times to automatically attempt rescheduling before giving up
              </p>
            </div>

            {/* Delay Before Reschedule */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delay Before Reschedule (hours)</Label>
              <Select
                value={currentSettings.autoRescheduleDelayHours.toString()}
                onValueChange={(value) => handleDelayHoursChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select delay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long to wait after marking a meeting as no-show before attempting reschedule
              </p>
            </div>

            {/* Reschedule Window */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reschedule Window (days)</Label>
              <Select
                value={currentSettings.rescheduleDaysOut.toString()}
                onValueChange={(value) => handleDaysOutChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Next 3 days</SelectItem>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How far in the future to look for available reschedule slots
              </p>
            </div>

            {/* Business Hours */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Business Hours</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Select
                    value={currentSettings.businessHours.start}
                    onValueChange={(value) => handleBusinessHoursChange('start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Select
                    value={currentSettings.businessHours.end}
                    onValueChange={(value) => handleBusinessHoursChange('end', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Only schedule reschedule meetings during these hours
              </p>
            </div>

            {/* Include Weekends */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Include Weekends</Label>
                <div className="text-xs text-muted-foreground">
                  Allow rescheduling meetings on Saturday and Sunday
                </div>
              </div>
              <Switch
                checked={currentSettings.includeWeekends}
                onCheckedChange={handleWeekendsToggle}
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="text-blue-600 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">How Auto-Reschedule Works</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>• System monitors for meetings marked as "no-show"</li>
                <li>• After the delay period, it finds the next available time slot</li>
                <li>• Sends a professional reschedule email to the prospect</li>
                <li>• Updates the meeting time if prospect confirms</li>
                <li>• Respects your business hours and availability</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}