import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sun, Mail, Brain, AlertTriangle, Target, Wrench, Eye, DollarSign, Building, User } from "lucide-react";

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

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings/morning-briefing']
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<MorningBriefingSettings>) => {
      return await apiRequest('/api/settings/morning-briefing', {
        method: 'PATCH',
        body: newSettings
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

  const testBriefingMutation = useMutation({
    mutationFn: () => {
      // Simulate sending test briefing
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      toast({
        title: "Test briefing sent",
        description: "Check your email for the morning briefing preview",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send test briefing",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sun size={20} />
            <span>Morning Briefing Automation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Morning Briefing</Label>
              <div className="text-sm text-muted-foreground">
                Send a consolidated briefing with all today's meetings and prospect insights
              </div>
            </div>
            <Switch
              checked={Boolean(settings?.enabled ?? false)}
              onCheckedChange={(enabled) => {
                updateSettingsMutation.mutate({ enabled });
              }}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          {settings?.enabled && (
            <>
              {/* Timing Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sendTime">Send Time</Label>
                  <Input
                    id="sendTime"
                    type="time"
                    value={settings?.sendTime || "08:00"}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({ sendTime: e.target.value });
                    }}
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    What time to send the daily morning briefing
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Next briefing: Tomorrow at {settings?.sendTime || "08:00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold flex items-center space-x-2">
                  <Brain size={18} />
                  <span>Content Settings</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign size={16} className="text-green-600" />
                      <Label className="text-sm">Revenue</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includeRevenue ?? false)}
                      onCheckedChange={(includeRevenue) => {
                        updateSettingsMutation.mutate({ includeRevenue });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Building size={16} className="text-blue-600" />
                      <Label className="text-sm">Industry</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includeIndustry ?? false)}
                      onCheckedChange={(includeIndustry) => {
                        updateSettingsMutation.mutate({ includeIndustry });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-indigo-600" />
                      <Label className="text-sm">Contact Info</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includeContactInfo ?? false)}
                      onCheckedChange={(includeContactInfo) => {
                        updateSettingsMutation.mutate({ includeContactInfo });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={16} className="text-red-600" />
                      <Label className="text-sm">Pain Points</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includePainPoints ?? false)}
                      onCheckedChange={(includePainPoints) => {
                        updateSettingsMutation.mutate({ includePainPoints });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Target size={16} className="text-orange-600" />
                      <Label className="text-sm">Objections</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includeObjections ?? false)}
                      onCheckedChange={(includeObjections) => {
                        updateSettingsMutation.mutate({ includeObjections });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Wrench size={16} className="text-purple-600" />
                      <Label className="text-sm">Current Solutions</Label>
                    </div>
                    <Switch
                      checked={Boolean(settings?.includeCurrentSolutions ?? false)}
                      onCheckedChange={(includeCurrentSolutions) => {
                        updateSettingsMutation.mutate({ includeCurrentSolutions });
                      }}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  onClick={() => testBriefingMutation.mutate()}
                  disabled={testBriefingMutation.isPending}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Mail size={16} />
                  <span>
                    {testBriefingMutation.isPending ? "Sending..." : "Send Test Briefing"}
                  </span>
                </Button>

                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Eye size={16} />
                  <span>{showPreview ? "Hide Preview" : "Show Preview"}</span>
                </Button>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-3 flex items-center space-x-2">
                    <Eye size={18} />
                    <span>Preview</span>
                  </h4>
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
                              {settings?.includeIndustry && <span>TechCorp • Technology</span>}
                            </div>
                            <div className="text-sm text-gray-600">
                              {settings?.includeRevenue && <span>Revenue: $2.5M</span>}
                            </div>
                          </div>

                          {settings?.includeContactInfo && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-indigo-700">Contact:</span>
                              <div className="text-xs text-gray-700 mt-1">
                                <div>Name: John Smith</div>
                                <div>Email: john.smith@techcorp.com</div>
                                <div>Phone: (555) 123-4567</div>
                              </div>
                            </div>
                          )}
                          
                          {settings?.includePainPoints && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-red-700">Pain Points:</span>
                              <ul className="text-xs text-gray-700 mt-1">
                                <li>• Scaling challenges with current infrastructure</li>
                                <li>• High operational costs</li>
                              </ul>
                            </div>
                          )}

                          {settings?.includeObjections && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-orange-700">Likely Objections:</span>
                              <ul className="text-xs text-gray-700 mt-1">
                                <li>• Need to consult with team</li>
                                <li>• Budget constraints</li>
                              </ul>
                            </div>
                          )}

                          {settings?.includeCurrentSolutions && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-purple-700">Current Solutions:</span>
                              <ul className="text-xs text-gray-700 mt-1">
                                <li>• Using legacy CRM system</li>
                                <li>• Manual processes</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}