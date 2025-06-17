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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQualificationRuleSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import QualificationRuleCard from "@/components/qualification-rule-card";
import type { QualificationRule } from "@shared/schema";
import { z } from "zod";

const formSchema = insertQualificationRuleSchema.extend({
  value: z.string().min(1, "Value is required"),
});

export default function QualificationRules() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QualificationRule | null>(null);

  const { data: rules, isLoading } = useQuery<QualificationRule[]>({
    queryKey: ['/api/qualification-rules'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      field: "revenue",
      operator: "gte",
      value: "",
      priority: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => apiRequest('POST', '/api/qualification-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qualification-rules'] });
      toast({
        title: "Rule Created",
        description: "Qualification rule has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create qualification rule.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<z.infer<typeof formSchema>>) => 
      apiRequest('PATCH', `/api/qualification-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qualification-rules'] });
      toast({
        title: "Rule Updated",
        description: "Qualification rule has been updated successfully.",
      });
      setEditingRule(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update qualification rule.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/qualification-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qualification-rules'] });
      toast({
        title: "Rule Deleted",
        description: "Qualification rule has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete qualification rule.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rule: QualificationRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      deleteMutation.mutate(id);
    }
  };

  const fieldOptions = [
    { value: "revenue", label: "Revenue" },
    { value: "company_size", label: "Company Size" },
    { value: "industry", label: "Industry" },
    { value: "budget", label: "Budget" },
    { value: "company", label: "Company Name" },
  ];

  const operatorOptions = [
    { value: "gte", label: "Greater than or equal to (≥)" },
    { value: "lte", label: "Less than or equal to (≤)" },
    { value: "eq", label: "Equal to (=)" },
    { value: "ne", label: "Not equal to (≠)" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Qualification Rules</h1>
            <p className="text-sm text-slate-600 mt-1">Configure automatic qualification criteria for your sales meetings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-brand-500 hover:bg-brand-600"
                onClick={() => {
                  setEditingRule(null);
                  form.reset();
                }}
              >
                <Plus className="mr-2" size={16} />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Qualification Rule" : "Create Qualification Rule"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Revenue Threshold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="field"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field to Check</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a field" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fieldOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {operatorOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 25000 or Technology" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this qualification rule
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
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-brand-500 hover:bg-brand-600"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingRule ? "Update Rule" : "Create Rule"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        {/* Active Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {rules?.filter(rule => rule.isActive).map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-900">{rule.name}</p>
                      <p className="text-xs text-green-700">
                        {rule.field} {rule.operator} {rule.value}
                      </p>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge variant="default">Active</Badge>
                        <span className="text-xs text-green-600">Priority: {rule.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </Button>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                ))}
                {rules?.filter(rule => rule.isActive).length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    No active rules configured. Create your first rule to start qualifying meetings automatically.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Rules */}
        {rules?.filter(rule => !rule.isActive).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inactive Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.filter(rule => !rule.isActive).map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                      <p className="text-xs text-gray-700">
                        {rule.field} {rule.operator} {rule.value}
                      </p>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge variant="secondary">Inactive</Badge>
                        <span className="text-xs text-gray-600">Priority: {rule.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </Button>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rule Templates */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rule Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Revenue Qualification</h4>
                <p className="text-sm text-slate-600 mb-3">Qualify leads based on annual revenue</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    form.reset({
                      name: "Revenue Threshold",
                      field: "revenue",
                      operator: "gte",
                      value: "25000",
                      priority: 1,
                      isActive: true,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  Use Template
                </Button>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Company Size Filter</h4>
                <p className="text-sm text-slate-600 mb-3">Filter by number of employees</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    form.reset({
                      name: "Company Size",
                      field: "company_size",
                      operator: "gte",
                      value: "50",
                      priority: 2,
                      isActive: true,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  Use Template
                </Button>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Industry Exclusion</h4>
                <p className="text-sm text-slate-600 mb-3">Exclude specific industries</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    form.reset({
                      name: "Industry Filter",
                      field: "industry",
                      operator: "not_contains",
                      value: "Non-profit",
                      priority: 3,
                      isActive: true,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  Use Template
                </Button>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Budget Requirement</h4>
                <p className="text-sm text-slate-600 mb-3">Minimum budget threshold</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    form.reset({
                      name: "Budget Threshold",
                      field: "budget",
                      operator: "gte",
                      value: "10000",
                      priority: 4,
                      isActive: true,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  Use Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
