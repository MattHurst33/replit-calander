import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Edit, Trash2, Send, Clock, User, Building } from "lucide-react";

interface EmailTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTemplateData {
  name: string;
  type: string;
  subject: string;
  content: string;
  isActive: boolean;
}

export default function EmailAutomation() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: "",
    type: "qualified_appointment",
    subject: "",
    content: "",
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Email template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create email template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateTemplateData> }) => {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "Email template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setEditingTemplate(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "Email template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "qualified_appointment",
      subject: "",
      content: "",
      isActive: true,
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      isActive: template.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'qualified_appointment':
        return 'Qualified Appointment';
      case 'follow_up':
        return 'Follow Up';
      case 'reminder':
        return 'Reminder';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'qualified_appointment':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-blue-100 text-blue-800';
      case 'reminder':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultTemplates = {
    qualified_appointment: `Hi {{"prospect_name"}},

Thank you for scheduling our meeting! I'm excited to discuss how we can help {{company_name}} achieve its goals.

Meeting Details:
📅 Date: {{meeting_date}}
🕐 Time: {{meeting_time}}
📍 Location: {{meeting_link}}

To make our time together as productive as possible, I've prepared some insights about {{company_name}} and your industry. We'll be discussing solutions tailored specifically to your needs.

If you have any questions before our meeting, please don't hesitate to reach out.

Looking forward to speaking with you!

Best regards,
{{your_name}}`,

    follow_up: `Hi {{"prospect_name"}},

Thank you for taking the time to meet with me yesterday. I enjoyed our conversation about {{company_name}}'s goals and challenges.

As discussed, I'm attaching the information about our solutions that could help with:
• {{pain_point_1}}
• {{pain_point_2}}
• {{pain_point_3}}

Next Steps:
{{next_steps}}

I'm here if you have any questions or would like to schedule a follow-up discussion.

Best regards,
{{your_name}}`,

    reminder: `Hi {{"prospect_name"}},

This is a friendly reminder about our upcoming meeting tomorrow:

📅 Date: {{meeting_date}}
🕐 Time: {{meeting_time}}
📍 Meeting Link: {{meeting_link}}

I'm looking forward to discussing how we can help {{company_name}} overcome the challenges we discussed.

See you tomorrow!

Best regards,
{{your_name}}`
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Automation</h1>
          <p className="text-muted-foreground">
            Create and manage automated email templates for qualified appointments
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus size={16} />
              <span>Create Template</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Email Template" : "Create Email Template"}
              </DialogTitle>
              <DialogDescription>
                Create a customizable email template for automated sending to qualified appointments.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Welcome Email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Email Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualified_appointment">Qualified Appointment</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Excited for our meeting, {{prospect_name}}!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={defaultTemplates[formData.type as keyof typeof defaultTemplates]}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active Template</Label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Available Variables:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>• {"{{prospect_name}}"}</div>
                  <div>• {"{{company_name}}"}</div>
                  <div>• {"{{meeting_date}}"}</div>
                  <div>• {"{{meeting_time}}"}</div>
                  <div>• {"{{meeting_link}}"}</div>
                  <div>• {"{{your_name}}"}</div>
                  <div>• {"{{pain_point_1}}"}</div>
                  <div>• {"{{pain_point_2}}"}</div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getTypeColor(template.type)}>
                    {getTypeLabel(template.type)}
                  </Badge>
                  {template.isActive && (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Subject:</p>
                  <p className="text-sm text-gray-600">{template.subject}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Preview:</p>
                  <p className="text-xs text-gray-500 line-clamp-3">
                    {template.content.substring(0, 120)}...
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span className="text-xs text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!templates || templates.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No email templates yet</h3>
              <p className="text-gray-500 text-center mb-4">
                Create your first automated email template to start sending personalized messages to qualified appointments.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}