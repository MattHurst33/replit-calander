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
import { Eye, Clock, Mail } from "lucide-react";

interface MorningBriefingSettings {
  enabled: boolean;
  sendTime: string;
  emailEnabled: boolean;
  includeRevenue: boolean;
  includeIndustry: boolean;
  includeContactInfo: boolean;
  includeObjections: boolean;
  includePainPoints: boolean;
  includeCurrentSolutions: boolean;
}

export default function MorningBriefingSettings() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);

  const { data: settings, isLoading } = useQuery<MorningBriefingSettings>({
    queryKey: ['/api/settings/morning-briefing'],
    retry: false
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<MorningBriefingSettings>) => {
      return await apiRequest('/api/settings/morning-briefing', {
        method: 'PATCH',
        body: JSON.stringify(newSettings)
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Morning briefing settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/morning-briefing'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  const currentSettings = settings || {
    enabled: false,
    sendTime: "08:00",
    emailEnabled: false,
    includeRevenue: false,
    includeIndustry: false,
    includeContactInfo: false,
    includeObjections: false,
    includePainPoints: false,
    includeCurrentSolutions: false
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Morning Briefing Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Enable Morning Briefing</Label>
              <p className="text-sm text-muted-foreground">
                Receive daily briefings about your upcoming meetings
              </p>
            </div>
            <Switch
              id="enabled"
              checked={currentSettings.enabled}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ enabled: checked });
              }}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          {/* Send Time */}
          <div className="space-y-2">
            <Label htmlFor="sendTime">Send Time</Label>
            <Input
              id="sendTime"
              type="time"
              value={currentSettings.sendTime}
              onChange={(e) => {
                updateSettingsMutation.mutate({ sendTime: e.target.value });
              }}
              disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
            />
          </div>

          {/* Email Settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailEnabled">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send briefing via email instead of dashboard notification
              </p>
            </div>
            <Switch
              id="emailEnabled"
              checked={currentSettings.emailEnabled}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ emailEnabled: checked });
              }}
              disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
            />
          </div>

          {/* Content Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Include in Briefing</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="includeRevenue">Revenue Information</Label>
                <Switch
                  id="includeRevenue"
                  checked={currentSettings.includeRevenue}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includeRevenue: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includeIndustry">Industry Details</Label>
                <Switch
                  id="includeIndustry"
                  checked={currentSettings.includeIndustry}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includeIndustry: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includeContactInfo">Contact Information</Label>
                <Switch
                  id="includeContactInfo"
                  checked={currentSettings.includeContactInfo}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includeContactInfo: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includePainPoints">Pain Points</Label>
                <Switch
                  id="includePainPoints"
                  checked={currentSettings.includePainPoints}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includePainPoints: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includeObjections">Likely Objections</Label>
                <Switch
                  id="includeObjections"
                  checked={currentSettings.includeObjections}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includeObjections: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includeCurrentSolutions">Current Solutions</Label>
                <Switch
                  id="includeCurrentSolutions"
                  checked={currentSettings.includeCurrentSolutions}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ includeCurrentSolutions: checked });
                  }}
                  disabled={!currentSettings.enabled || updateSettingsMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">
                Preview how your morning briefing will look
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!currentSettings.enabled}
            >
              <Eye size={16} className="mr-2" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {/* Preview Section */}
          {showPreview && currentSettings.enabled && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye size={18} />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="border-b pb-3">
                      <h5 className="font-semibold">Morning Briefing Preview</h5>
                      <p className="text-sm text-gray-600">Sample briefing with today's meetings</p>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <h6 className="font-medium">10:00 AM - John Smith</h6>
                          <Badge className="bg-green-100 text-green-800">Qualified</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div className="text-sm text-gray-600">
                            {currentSettings.includeIndustry && <span>TechCorp • Technology</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            {currentSettings.includeRevenue && <span>Revenue: $2.5M</span>}
                          </div>
                        </div>

                        {currentSettings.includeContactInfo && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-indigo-700">Contact:</span>
                            <div className="text-xs text-gray-700 mt-1">
                              <div>Name: John Smith</div>
                              <div>Email: john.smith@techcorp.com</div>
                              <div>Phone: (555) 123-4567</div>
                            </div>
                          </div>
                        )}
                        
                        {currentSettings.includePainPoints && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-red-700">Pain Points:</span>
                            <ul className="text-xs text-gray-700 mt-1">
                              <li>• Scaling challenges with current infrastructure</li>
                              <li>• High operational costs</li>
                            </ul>
                          </div>
                        )}

                        {currentSettings.includeObjections && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-orange-700">Likely Objections:</span>
                            <ul className="text-xs text-gray-700 mt-1">
                              <li>• Need to consult with team</li>
                              <li>• Budget constraints</li>
                            </ul>
                          </div>
                        )}

                        {currentSettings.includeCurrentSolutions && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-purple-700">Current Solutions:</span>
                            <ul className="text-xs text-gray-700 mt-1">
                              <li>• Legacy CRM system</li>
                              <li>• Manual processes</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}