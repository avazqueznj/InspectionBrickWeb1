import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInspectionTypeSchema, type InsertInspectionType, type InspectionTypeWithFormFields, type InspectionTypeFormField, type InsertInspectionTypeFormField, type Layout } from "@shared/schema";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface InspectionTypeModalProps {
  inspectionType: InspectionTypeWithFormFields | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertInspectionType) => void;
  isPending: boolean;
  companies: Array<{ id: string; name: string }>;
  currentCompanyId: string | null;
}

interface FormFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formField: InspectionTypeFormField | null;
  inspectionTypeId: string;
  onSuccess: () => void;
}

function FormFieldDialog({ open, onOpenChange, formField, inspectionTypeId, onSuccess }: FormFieldDialogProps) {
  const { toast } = useToast();
  const isEdit = !!formField;
  
  const [formFieldName, setFormFieldName] = useState("");
  const [formFieldType, setFormFieldType] = useState<"TEXT" | "NUM">("TEXT");
  const [formFieldLength, setFormFieldLength] = useState<number>(0);

  useEffect(() => {
    if (open && formField) {
      setFormFieldName(formField.formFieldName);
      setFormFieldType(formField.formFieldType as "TEXT" | "NUM");
      setFormFieldLength(formField.formFieldLength);
    } else if (!open) {
      setFormFieldName("");
      setFormFieldType("TEXT");
      setFormFieldLength(0);
    }
  }, [open, formField]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertInspectionTypeFormField) => {
      return await apiRequest("POST", `/api/inspection-types/${inspectionTypeId}/form-fields`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types", inspectionTypeId, "form-fields"] });
      toast({
        title: "Success",
        description: "Form field created successfully",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create form field",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertInspectionTypeFormField) => {
      return await apiRequest("PATCH", `/api/inspection-type-form-fields/${formField?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types", inspectionTypeId, "form-fields"] });
      toast({
        title: "Success",
        description: "Form field updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update form field",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: InsertInspectionTypeFormField = {
      inspectionTypeId,
      formFieldName,
      formFieldType,
      formFieldLength,
    };

    if (isEdit && formField) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-form-field">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEdit ? "Edit Form Field" : "Add Form Field"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-form-field-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Field Name</label>
            <Input
              value={formFieldName}
              onChange={(e) => setFormFieldName(e.target.value)}
              placeholder="Enter field name"
              required
              maxLength={64}
              data-testid="input-formFieldName"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Field Type</label>
            <Select value={formFieldType} onValueChange={(value: "TEXT" | "NUM") => setFormFieldType(value)}>
              <SelectTrigger data-testid="select-formFieldType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">TEXT</SelectItem>
                <SelectItem value="NUM">NUM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Field Length (0-64)</label>
            <Input
              type="text"
              value={formFieldLength}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for typing
                if (value === '') {
                  setFormFieldLength(0);
                  return;
                }
                // Only allow numeric input
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 64) {
                  setFormFieldLength(numValue);
                }
              }}
              placeholder="Enter length (0-64)"
              required
              data-testid="input-formFieldLength"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-form-field"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-form-field"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update Field" : "Add Field"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InspectionTypeModal({ inspectionType, open, onOpenChange, onSubmit, isPending, companies, currentCompanyId }: InspectionTypeModalProps) {
  const { toast } = useToast();
  const isEdit = !!inspectionType;
  const [formFieldDialogOpen, setFormFieldDialogOpen] = useState(false);
  const [selectedFormField, setSelectedFormField] = useState<InspectionTypeFormField | null>(null);
  const [selectedLayoutIds, setSelectedLayoutIds] = useState<string[]>([]);
  const [allLayoutsChecked, setAllLayoutsChecked] = useState(false);

  const form = useForm<InsertInspectionType>({
    resolver: zodResolver(insertInspectionTypeSchema),
    defaultValues: {
      inspectionTypeName: "",
      status: "ACTIVE",
      companyId: currentCompanyId || "",
    },
  });

  // Fetch available layouts for the company
  const { data: layouts = [] } = useQuery<Layout[]>({
    queryKey: ["/api/layouts", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const response = await fetch(`/api/layouts?companyId=${currentCompanyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch layouts");
      }
      return response.json();
    },
    enabled: !!currentCompanyId && open,
  });

  // Fetch full inspection type details (including layoutIds) when editing
  // Include companyId to ensure proper scoping (critical for superusers who can view multiple companies)
  const { data: fullInspectionType } = useQuery({
    queryKey: ["/api/inspection-types", inspectionType?.inspectionTypeName, currentCompanyId],
    queryFn: async () => {
      if (!inspectionType?.inspectionTypeName) return null;
      const params = new URLSearchParams();
      if (currentCompanyId) params.set("companyId", currentCompanyId);
      const url = `/api/inspection-types/${inspectionType.inspectionTypeName}${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch inspection type");
      }
      return response.json();
    },
    enabled: !!inspectionType?.inspectionTypeName && open && isEdit,
  });

  // Fetch form fields for this inspection type
  // Include companyId to ensure proper scoping (critical for superusers who can view multiple companies)
  const { data: formFields = [], refetch: refetchFormFields } = useQuery<InspectionTypeFormField[]>({
    queryKey: ["/api/inspection-types", inspectionType?.inspectionTypeName, "form-fields", currentCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCompanyId) params.set("companyId", currentCompanyId);
      const url = `/api/inspection-types/${inspectionType?.inspectionTypeName}/form-fields${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch form fields");
      }
      return response.json();
    },
    enabled: isEdit && !!inspectionType?.inspectionTypeName,
  });

  // Delete form field mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/inspection-type-form-fields/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types", inspectionType?.inspectionTypeName, "form-fields"] });
      toast({
        title: "Success",
        description: "Form field deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete form field",
        variant: "destructive",
      });
    },
  });

  // Reset form when modal opens/closes or inspection type changes
  useEffect(() => {
    if (open && inspectionType) {
      // Editing existing inspection type
      form.reset({
        inspectionTypeName: inspectionType.inspectionTypeName,
        status: inspectionType.status,
        companyId: currentCompanyId || "",
      });
      
      // Use fullInspectionType if available (includes layoutIds), otherwise default to all layouts
      if (fullInspectionType && fullInspectionType.layoutIds !== undefined) {
        const layoutIds = fullInspectionType.layoutIds || [];
        setSelectedLayoutIds(layoutIds);
        setAllLayoutsChecked(layoutIds.length === 0);
      } else {
        // Fallback while loading or if layoutIds not available
        setSelectedLayoutIds([]);
        setAllLayoutsChecked(true);
      }
    } else if (open && !inspectionType) {
      // Creating new inspection type - default to "All Layouts"
      form.reset({
        inspectionTypeName: "",
        status: "ACTIVE",
        companyId: currentCompanyId || "",
      });
      setSelectedLayoutIds([]);
      setAllLayoutsChecked(true); // Default to "All Layouts" for new inspection types
    } else if (!open) {
      // Modal closed - reset everything
      form.reset({
        inspectionTypeName: "",
        status: "ACTIVE",
        companyId: currentCompanyId || "",
      });
      setSelectedLayoutIds([]);
      setAllLayoutsChecked(false);
    }
  }, [open, inspectionType, fullInspectionType, form, currentCompanyId]);

  const handleSubmit = (data: InsertInspectionType) => {
    // Include layoutIds in submission (empty array = all layouts)
    const submitData = {
      ...data,
      layoutIds: allLayoutsChecked ? [] : selectedLayoutIds,
    };
    onSubmit(submitData as any);
  };

  const handleAllLayoutsToggle = (checked: boolean) => {
    setAllLayoutsChecked(checked);
    if (checked) {
      setSelectedLayoutIds([]);
    }
  };

  const handleLayoutToggle = (layoutId: string, checked: boolean) => {
    if (checked) {
      setSelectedLayoutIds(prev => [...prev, layoutId]);
    } else {
      setSelectedLayoutIds(prev => prev.filter(id => id !== layoutId));
      setAllLayoutsChecked(false);
    }
  };

  const handleAddFormField = () => {
    setSelectedFormField(null);
    setFormFieldDialogOpen(true);
  };

  const handleEditFormField = (formField: InspectionTypeFormField) => {
    setSelectedFormField(formField);
    setFormFieldDialogOpen(true);
  };

  const handleDeleteFormField = (id: string) => {
    if (confirm("Are you sure you want to delete this form field?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-inspection-type">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {isEdit ? "Edit Inspection Type" : "Create Inspection Type"}
                </DialogTitle>
                {isEdit && (
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {inspectionType.inspectionTypeName}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inspectionTypeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Type Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isEdit}
                          placeholder="Enter inspection type name"
                          maxLength={64}
                          data-testid="input-inspectionTypeName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-companyId">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Layouts Section */}
              <div className="border rounded-md p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-medium mb-2">EDI Layouts</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select which layouts this inspection type applies to. If no layouts are selected, it will apply to all layouts.
                  </p>
                </div>

                <div className="flex items-center space-x-2 p-2 rounded border bg-muted/30">
                  <Checkbox
                    id="all-layouts"
                    checked={allLayoutsChecked}
                    onCheckedChange={(checked) => handleAllLayoutsToggle(checked as boolean)}
                    data-testid="checkbox-all-layouts"
                  />
                  <label
                    htmlFor="all-layouts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    All Layouts
                  </label>
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                </div>

                {layouts.length > 0 && (
                  <div className="space-y-2">
                    {layouts.map((layout) => (
                      <div key={layout.id} className="flex items-center space-x-2 p-2 rounded border">
                        <Checkbox
                          id={`layout-${layout.id}`}
                          checked={selectedLayoutIds.includes(layout.id)}
                          onCheckedChange={(checked) => handleLayoutToggle(layout.id, checked as boolean)}
                          disabled={allLayoutsChecked}
                          data-testid={`checkbox-layout-${layout.layoutName}`}
                        />
                        <label
                          htmlFor={`layout-${layout.id}`}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {layout.layoutName}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {layouts.length === 0 && !allLayoutsChecked && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No layouts available for this company
                  </p>
                )}
              </div>

              {/* Form Fields Section - Only show in edit mode */}
              {isEdit && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Form Fields</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage custom form fields for this inspection type
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddFormField}
                      size="sm"
                      data-testid="button-add-form-field"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Field Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Length
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formFields.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center">
                              <p className="text-sm text-muted-foreground">
                                No form fields yet. Add one to get started.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          formFields.map((formField) => (
                            <tr
                              key={formField.id}
                              className="hover-elevate"
                              data-testid={`row-form-field-${formField.id}`}
                            >
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium" data-testid={`text-formFieldName-${formField.id}`}>
                                  {formField.formFieldName}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="secondary"
                                  data-testid={`badge-formFieldType-${formField.id}`}
                                >
                                  {formField.formFieldType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-muted-foreground" data-testid={`text-formFieldLength-${formField.id}`}>
                                  {formField.formFieldLength}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditFormField(formField)}
                                    data-testid={`button-edit-form-field-${formField.id}`}
                                    title="Edit Form Field"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteFormField(formField.id)}
                                    data-testid={`button-delete-form-field-${formField.id}`}
                                    title="Delete Form Field"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isPending}
                  data-testid="button-save"
                >
                  {isPending ? "Saving..." : isEdit ? "Update Inspection Type" : "Create Inspection Type"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Form Field Dialog */}
      {isEdit && inspectionType && (
        <FormFieldDialog
          open={formFieldDialogOpen}
          onOpenChange={setFormFieldDialogOpen}
          formField={selectedFormField}
          inspectionTypeId={inspectionType.id}
          onSuccess={refetchFormFields}
        />
      )}
    </>
  );
}
