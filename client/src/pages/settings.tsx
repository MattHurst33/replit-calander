import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, 
  Mail, 
  Bell, 
  User, 
  Shield, 
  Calendar, 
  Database, 
  Save,
  Eye,
  EyeOff,
  TestTube,
  RefreshCw
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import MorningBriefingSettings from "@/components/morning-briefing-settings";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  timezone: z.string(),
});

const apiKeysSchema = z.object({
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  calendlyAccessToken: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  syncNotifications: z.boolean(),
  qualificationAlerts: z.boolean(),
  dailyReports: z.boolean(),
  weeklyReports: z.boolean(),
  errorAlerts: z.boolean(),
});

const systemSchema = z.object({
  syncInterval: z.string(),
  qualificationMode: z.string(),
  calendarColorCoding: z.boolean(),
  autoFreeCalendarSlots: z.boolean(),
  autoArchive: z.boolean(),
  archiveAfterDays: z.string(),
});

type ProfileSettings = z.infer<typeof profileSchema>;
type ApiKeySettings = z.infer<typeof apiKeysSchema>;
type NotificationSettings = z.infer<typeof notificationSchema>;
type SystemSettings = z.infer<typeof systemSchema>;

export default function Settings() {
  const { toast } = useToast();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Fetch current user settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Mock current settings - in real app these would come from API
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    name: "John Doe",
    email: "john@company.com",
    company: "Acme Corp",
    timezone: "America/New_York",
  });

  const [apiKeySettings, setApiKeySettings] = useState<ApiKeySettings>({
    googleClientId: "****-****.apps.googleusercontent.com",
    googleClientSecret: "****-****-****",
    calendlyAccessToken: "eyJhbGci****",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "reports@company.com",
    smtpPass: "****",
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    syncNotifications: true,
    qualificationAlerts: true,
    dailyReports: true,
    weeklyReports: false,
    errorAlerts: true,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    syncInterval: "15",
    qualificationMode: "automatic",
    calendarColorCoding: true,
    autoFreeCalendarSlots: userSettings?.autoFreeCalendarSlots ?? true,
    autoArchive: true,
    archiveAfterDays: "90",
  });

  const profileForm = useForm<ProfileSettings>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileSettings,
  });

  const apiKeysForm = useForm<ApiKeySettings>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: apiKeySettings,
  });

  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSchema),
    defaultValues: notificationSettings,
  });

  const systemForm = useForm<SystemSettings>({
    resolver: zodResolver(systemSchema),
    defaultValues: systemSettings,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileSettings) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setProfileSettings(data);
          resolve(data);
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
    },
  });

  const updateApiKeysMutation = useMutation({
    mutationFn: (data: ApiKeySettings) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setApiKeySettings(data);
          resolve(data);
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "API Keys Updated",
        description: "Your API keys have been saved successfully.",
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: NotificationSettings) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setNotificationSettings(data);
          resolve(data);
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: (data: SystemSettings) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setSystemSettings(data);
          resolve(data);
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "System Settings Updated",
        description: "Your system settings have been saved successfully.",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (service: string) => {
      // Mock API test - in real app this would test the actual connection
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.3) {
            resolve({ success: true, service });
          } else {
            reject(new Error(`Failed to connect to ${service}`));
          }
        }, 2000);
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${data.service}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maskApiKey = (value: string) => {
    if (!value) return "";
    if (value.length <= 8) return "*".repeat(value.length);
    return value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600 mt-1">Manage your account, integrations, and system preferences</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User size={20} />
                  <span>Profile Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                                <SelectItem value="America/Chicago">Central Time</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-brand-500 hover:bg-brand-600"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="mr-2" size={16} />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Settings */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              {/* Google Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar size={20} className="text-blue-600" />
                    <span>Google Calendar Integration</span>
                    <Badge variant="default">Connected</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...apiKeysForm}>
                    <form onSubmit={apiKeysForm.handleSubmit((data) => updateApiKeysMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={apiKeysForm.control}
                          name="googleClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client ID</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showApiKeys.googleClientId ? "text" : "password"}
                                    {...field}
                                    value={showApiKeys.googleClientId ? field.value || "" : maskApiKey(field.value || "")}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => toggleApiKeyVisibility('googleClientId')}
                                  >
                                    {showApiKeys.googleClientId ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={apiKeysForm.control}
                          name="googleClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Secret</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showApiKeys.googleClientSecret ? "text" : "password"}
                                    {...field}
                                    value={showApiKeys.googleClientSecret ? field.value || "" : maskApiKey(field.value || "")}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => toggleApiKeyVisibility('googleClientSecret')}
                                  >
                                    {showApiKeys.googleClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => testConnectionMutation.mutate('Google Calendar')}
                          disabled={testConnectionMutation.isPending}
                        >
                          {testConnectionMutation.isPending ? (
                            <RefreshCw className="mr-2 animate-spin" size={16} />
                          ) : (
                            <TestTube className="mr-2" size={16} />
                          )}
                          Test Connection
                        </Button>
                        <Button 
                          type="submit"
                          disabled={updateApiKeysMutation.isPending}
                        >
                          <Save className="mr-2" size={16} />
                          Save Keys
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Calendly */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar size={20} className="text-orange-600" />
                    <span>Calendly Integration</span>
                    <Badge variant="secondary">Not Connected</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={apiKeysForm.control}
                      name="calendlyAccessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showApiKeys.calendlyAccessToken ? "text" : "password"}
                                value={showApiKeys.calendlyAccessToken ? field.value : maskApiKey(field.value || "")}
                                onChange={field.onChange}
                                placeholder="Enter your Calendly access token"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => toggleApiKeyVisibility('calendlyAccessToken')}
                              >
                                {showApiKeys.calendlyAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">Webhook Configuration</h4>
                      <p className="text-sm text-orange-800 mb-2">
                        Add this webhook URL to your Calendly account:
                      </p>
                      <code className="block bg-white p-2 rounded text-sm">
                        {window.location.origin}/api/webhooks/calendly
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail size={20} className="text-green-600" />
                    <span>Email Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={apiKeysForm.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="smtp.gmail.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={apiKeysForm.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="587" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={apiKeysForm.control}
                      name="smtpUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="reports@company.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={apiKeysForm.control}
                      name="smtpPass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showApiKeys.smtpPass ? "text" : "password"}
                                value={showApiKeys.smtpPass ? field.value : maskApiKey(field.value || "")}
                                onChange={field.onChange}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => toggleApiKeyVisibility('smtpPass')}
                              >
                                {showApiKeys.smtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Automation Settings */}
          <TabsContent value="automation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw size={20} />
                  <span>Meeting Automation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MorningBriefingSettings />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell size={20} />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive email notifications for important events
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
                        control={notificationForm.control}
                        name="syncNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Sync Notifications</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Get notified when calendar sync completes
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
                        control={notificationForm.control}
                        name="qualificationAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Qualification Alerts</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Alerts when meetings need manual review
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

                      <Separator />

                      <FormField
                        control={notificationForm.control}
                        name="dailyReports"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Daily Reports</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive daily summary reports via email
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
                        control={notificationForm.control}
                        name="weeklyReports"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Weekly Reports</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive weekly analytics reports
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
                        control={notificationForm.control}
                        name="errorAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Error Alerts</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Get notified of system errors and failures
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
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-brand-500 hover:bg-brand-600"
                      disabled={updateNotificationsMutation.isPending}
                    >
                      <Save className="mr-2" size={16} />
                      {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database size={20} />
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit((data) => updateSystemMutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={systemForm.control}
                        name="syncInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sync Interval (minutes)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={systemForm.control}
                        name="qualificationMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualification Mode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="automatic">Automatic</SelectItem>
                                <SelectItem value="manual">Manual Only</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={systemForm.control}
                        name="calendarColorCoding"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Calendar Color Coding</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Automatically color-code calendar events based on qualification status
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
                        control={systemForm.control}
                        name="autoFreeCalendarSlots"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Auto-Free Calendar Slots</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Automatically mark Google Calendar events as free when prospects are disqualified
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
                        control={systemForm.control}
                        name="autoArchive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Auto Archive</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Automatically archive old meetings after specified period
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

                      {systemForm.watch('autoArchive') && (
                        <FormField
                          control={systemForm.control}
                          name="archiveAfterDays"
                          render={({ field }) => (
                            <FormItem className="ml-6">
                              <FormLabel>Archive After (days)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="30">30 days</SelectItem>
                                  <SelectItem value="60">60 days</SelectItem>
                                  <SelectItem value="90">90 days</SelectItem>
                                  <SelectItem value="180">180 days</SelectItem>
                                  <SelectItem value="365">1 year</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-brand-500 hover:bg-brand-600"
                      disabled={updateSystemMutation.isPending}
                    >
                      <Save className="mr-2" size={16} />
                      {updateSystemMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
