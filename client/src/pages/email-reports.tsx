import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Settings as SettingsIcon, Calendar, Download, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { EmailReport } from "@shared/schema";
import { z } from "zod";

const emailSettingsSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  recipients: z.string().min(1, "At least one recipient is required"),
  includeDetails: z.boolean(),
  includeCharts: z.boolean(),
});

type EmailSettings = z.infer<typeof emailSettingsSchema>;

export default function EmailReports() {
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Mock email settings - in real app this would come from API
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    frequency: "daily",
    recipients: "john@company.com",
    includeDetails: true,
    includeCharts: false,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<EmailReport[]>({
    queryKey: ['/api/email-reports'],
    queryFn: async () => {
      // Mock data since the backend doesn't have this endpoint yet
      return [
        {
          id: 1,
          userId: 1,
          reportDate: new Date('2024-06-16'),
          totalMeetings: 15,
          qualifiedMeetings: 8,
          disqualifiedMeetings: 4,
          needsReviewMeetings: 3,
          sentAt: new Date('2024-06-16T09:00:00'),
          createdAt: new Date('2024-06-16T09:00:00'),
        },
        {
          id: 2,
          userId: 1,
          reportDate: new Date('2024-06-15'),
          totalMeetings: 12,
          qualifiedMeetings: 7,
          disqualifiedMeetings: 3,
          needsReviewMeetings: 2,
          sentAt: new Date('2024-06-15T09:00:00'),
          createdAt: new Date('2024-06-15T09:00:00'),
        },
        {
          id: 3,
          userId: 1,
          reportDate: new Date('2024-06-14'),
          totalMeetings: 18,
          qualifiedMeetings: 11,
          disqualifiedMeetings: 5,
          needsReviewMeetings: 2,
          sentAt: new Date('2024-06-14T09:00:00'),
          createdAt: new Date('2024-06-14T09:00:00'),
        },
      ] as EmailReport[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const form = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: emailSettings,
  });

  const sendReportMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/reports/daily'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-reports'] });
      toast({
        title: "Report Sent",
        description: "Daily report has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: EmailSettings) => {
      // Mock API call - in real app this would call the backend
      return new Promise(resolve => {
        setTimeout(() => {
          setEmailSettings(data);
          resolve(data);
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Email report settings have been updated successfully.",
      });
      setIsSettingsOpen(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailSettings) => {
    updateSettingsMutation.mutate(data);
  };

  const getQualificationRate = (report: EmailReport) => {
    if (report.totalMeetings === 0) return 0;
    return Math.round((report.qualifiedMeetings / report.totalMeetings) * 100);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Email Reports</h1>
            <p className="text-sm text-slate-600 mt-1">Manage automated email reports and view sending history</p>
          </div>
          <div className="flex items-center space-x-4">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <SettingsIcon className="mr-2" size={16} />
                  Email Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Email Report Settings</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Report Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipients"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipients</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="email1@company.com, email2@company.com"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeDetails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Include Meeting Details</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Include individual meeting breakdowns in reports
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeCharts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Include Charts</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Include visual charts and graphs in reports
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-brand-500 hover:bg-brand-600"
                        disabled={updateSettingsMutation.isPending}
                      >
                        Save Settings
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={() => sendReportMutation.mutate()}
              disabled={sendReportMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {sendReportMutation.isPending ? (
                <Mail className="mr-2 animate-pulse" size={16} />
              ) : (
                <Send className="mr-2" size={16} />
              )}
              Send Now
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Current Settings Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="mx-auto mb-2 text-blue-600" size={24} />
                <p className="text-sm font-medium text-blue-900">Frequency</p>
                <p className="text-lg font-bold text-blue-600 capitalize">{emailSettings.frequency}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Mail className="mx-auto mb-2 text-green-600" size={24} />
                <p className="text-sm font-medium text-green-900">Recipients</p>
                <p className="text-lg font-bold text-green-600">{emailSettings.recipients.split(',').length}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Eye className="mx-auto mb-2 text-purple-600" size={24} />
                <p className="text-sm font-medium text-purple-900">Details</p>
                <p className="text-lg font-bold text-purple-600">{emailSettings.includeDetails ? 'Yes' : 'No'}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Download className="mx-auto mb-2 text-orange-600" size={24} />
                <p className="text-sm font-medium text-orange-900">Charts</p>
                <p className="text-lg font-bold text-orange-600">{emailSettings.includeCharts ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report History</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewOpen(true)}
              >
                <Eye className="mr-2" size={16} />
                Preview Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {reports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          Daily Report - {formatDate(report.reportDate)}
                        </h4>
                        <p className="text-sm text-slate-600">
                          Sent {formatDateTime(report.sentAt || report.createdAt)}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-slate-500">
                            {report.totalMeetings} meetings
                          </span>
                          <span className="text-xs text-green-600">
                            {getQualificationRate(report)}% qualified
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-bold text-green-600">{report.qualifiedMeetings}</p>
                          <p className="text-xs text-slate-500">Qualified</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-red-600">{report.disqualifiedMeetings}</p>
                          <p className="text-xs text-slate-500">Disqualified</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-600">{report.needsReviewMeetings}</p>
                          <p className="text-xs text-slate-500">Review</p>
                        </div>
                      </div>
                      <Badge variant={report.sentAt ? "default" : "secondary"}>
                        {report.sentAt ? "Sent" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {reports?.length === 0 && (
                  <div className="text-center py-8">
                    <Mail className="mx-auto text-slate-400 mb-4" size={48} />
                    <p className="text-slate-500">No email reports sent yet.</p>
                    <p className="text-sm text-slate-400 mt-1">Send your first report to get started.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Daily Summary</h4>
                <p className="text-sm text-slate-600 mb-3">Concise daily overview with key metrics</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="default">Active</Badge>
                  <span className="text-xs text-slate-500">Default template</span>
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Detailed Report</h4>
                <p className="text-sm text-slate-600 mb-3">Comprehensive report with meeting breakdowns</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Available</Badge>
                  <Button variant="link" size="sm" className="p-0 text-xs">
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Report Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Subject</h3>
                <p className="text-sm text-slate-600">
                  Sales Meeting Report - {formatDate(new Date())}
                </p>
              </div>
              
              <Separator />
              
              <div className="bg-white p-6 border border-slate-200 rounded-lg">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-slate-900">Daily Sales Meeting Report</h1>
                  <p className="text-slate-600">{formatDate(new Date())}</p>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
                    <p className="text-sm text-slate-600">Total Meetings</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">{stats?.qualified || 0}</p>
                    <p className="text-sm text-slate-600">Qualified</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-2xl font-bold text-red-600">{stats?.disqualified || 0}</p>
                    <p className="text-sm text-slate-600">Disqualified</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded">
                    <p className="text-2xl font-bold text-amber-600">{stats?.needsReview || 0}</p>
                    <p className="text-sm text-slate-600">Need Review</p>
                  </div>
                </div>
                
                <div className="text-center text-sm text-slate-500">
                  This is a preview of how your email report will appear.
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
