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
import { Clock, Mail, Brain, AlertTriangle, Target, Wrench, Eye } from "lucide-react";

interface PreMeetingSettings {
  enabled: boolean;
  leadTime: number;
  emailEnabled: boolean;
  includeObjections: boolean;
  includePainPoints: boolean;
  includeCurrentSolutions: boolean;
}

interface PreviewData {
  meeting: {
    id: number;
    title: string;
    attendeeName: string;
    startTime: string;
  };
  summary: {
    name: string;
    company: string;
    revenue: string;
    industry: string;
    painPoints: string[];
    likelyObjections: string[];
    currentSolutions: string[];
    lookingFor: string[];
    meetingContext: string;
  };
}

export default function PreMeetingSettings() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);

  const { data: settings, isLoading } = useQuery<PreMeetingSettings>({
    queryKey: ['/api/settings/pre-meeting'],
  });

  const { data: meetings } = useQuery({
    queryKey: ['/api/meetings'],
  });

  const { data: previewData, isLoading: previewLoading } = useQuery<PreviewData>({
    queryKey: ['/api/meetings', meetings?.[0]?.id, 'preview-summary'],
    queryFn: () => {
      if (!meetings?.[0]?.id) return null;
      return fetch(`/api/meetings/${meetings[0].id}/preview-summary`, {
        method: 'POST'
      }).then(res => res.json());
    },
    enabled: showPreview && !!meetings?.[0]?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<PreMeetingSettings>) =>
      fetch('/api/settings/pre-meeting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/pre-meeting'] });
      toast({
        title: "Settings Updated",
        description: "Pre-meeting summary automation settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update pre-meeting settings.",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: keyof PreMeetingSettings, value: any) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return <div>Loading pre-meeting settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Brain className="text-blue-600" size={20} />
            <Label className="text-base font-medium">Pre-Meeting Summary Automation</Label>
            {settings?.enabled && <Badge variant="secondary">Active</Badge>}
          </div>
          <p className="text-sm text-slate-600">
            Automatically generate and send prospect summaries before each qualified meeting
          </p>
        </div>
        <Switch
          checked={settings?.enabled || false}
          onCheckedChange={(enabled) => handleSettingChange('enabled', enabled)}
        />
      </div>

      {settings?.enabled && (
        <div className="space-y-4">
          {/* Timing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock size={18} />
                <span>Timing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="leadTime" className="min-w-0 flex-1">
                    Send summary this many minutes before meeting:
                  </Label>
                  <Input
                    id="leadTime"
                    type="number"
                    min="1"
                    max="60"
                    value={settings?.leadTime || 2}
                    onChange={(e) => handleSettingChange('leadTime', parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
                <p className="text-sm text-slate-500">
                  Recommended: 2-5 minutes gives you enough time to review without being too early
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail size={18} />
                <span>Delivery</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email notifications</Label>
                  <p className="text-sm text-slate-600">Send summary via email</p>
                </div>
                <Switch
                  checked={settings?.emailEnabled || false}
                  onCheckedChange={(enabled) => handleSettingChange('emailEnabled', enabled)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="text-red-500" size={16} />
                    <Label>Pain points analysis</Label>
                  </div>
                  <Switch
                    checked={settings?.includePainPoints || false}
                    onCheckedChange={(enabled) => handleSettingChange('includePainPoints', enabled)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="text-orange-500" size={16} />
                    <Label>Likely objections</Label>
                  </div>
                  <Switch
                    checked={settings?.includeObjections || false}
                    onCheckedChange={(enabled) => handleSettingChange('includeObjections', enabled)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench className="text-blue-500" size={16} />
                    <Label>Current solutions</Label>
                  </div>
                  <Switch
                    checked={settings?.includeCurrentSolutions || false}
                    onCheckedChange={(enabled) => handleSettingChange('includeCurrentSolutions', enabled)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye size={18} />
                  <span>Preview</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!meetings?.[0]?.id}
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showPreview && (
              <CardContent>
                {previewLoading ? (
                  <div className="text-center py-4">Generating preview...</div>
                ) : previewData ? (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                    <div className="border-b pb-2">
                      <h4 className="font-medium">{previewData.meeting.title}</h4>
                      <p className="text-sm text-slate-600">
                        {previewData.summary.name} from {previewData.summary.company}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Industry:</strong> {previewData.summary.industry}
                      </div>
                      <div>
                        <strong>Revenue:</strong> {previewData.summary.revenue}
                      </div>
                    </div>

                    {settings?.includePainPoints && (
                      <div>
                        <strong className="text-red-600">Pain Points:</strong>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {previewData.summary.painPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {settings?.includeObjections && (
                      <div>
                        <strong className="text-orange-600">Likely Objections:</strong>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {previewData.summary.likelyObjections.map((objection, i) => (
                            <li key={i}>{objection}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {settings?.includeCurrentSolutions && (
                      <div>
                        <strong className="text-blue-600">Current Solutions:</strong>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {previewData.summary.currentSolutions.map((solution, i) => (
                            <li key={i}>{solution}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500">
                    No meetings available for preview
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}