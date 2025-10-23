import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInspectionTypeSchema, type InsertInspectionType, type InspectionType, type InspectionTypeFormField, type InsertInspectionTypeFormField } from "@shared/schema";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface InspectionTypeModalProps {
  inspectionType: InspectionType | null;
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

  const form = useForm<InsertInspectionType>({
    resolver: zodResolver(insertInspectionTypeSchema),
    defaultValues: {
      inspectionTypeId: "",
      inspectionLayout: "",
      status: "ACTIVE",
      companyId: currentCompanyId || "",
    },
  });

  // Fetch form fields for this inspection type
  const { data: formFields = [], refetch: refetchFormFields } = useQuery<InspectionTypeFormField[]>({
    queryKey: ["/api/inspection-types", inspectionType?.inspectionTypeId, "form-fields"],
    queryFn: async () => {
      const response = await fetch(`/api/inspection-types/${inspectionType?.inspectionTypeId}/form-fields`);
      if (!response.ok) {
        throw new Error("Failed to fetch form fields");
      }
      return response.json();
    },
    enabled: isEdit && !!inspectionType?.inspectionTypeId,
  });

  // Delete form field mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/inspection-type-form-fields/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types", inspectionType?.inspectionTypeId, "form-fields"] });
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
      form.reset({
        inspectionTypeId: inspectionType.inspectionTypeId,
        inspectionLayout: inspectionType.inspectionLayout,
        status: inspectionType.status,
        companyId: currentCompanyId || "",
      });
    } else if (!open) {
      form.reset({
        inspectionTypeId: "",
        inspectionLayout: "",
        status: "ACTIVE",
        companyId: currentCompanyId || "",
      });
    }
  }, [open, inspectionType, form, currentCompanyId]);

  const handleSubmit = (data: InsertInspectionType) => {
    onSubmit(data);
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
                    {inspectionType.inspectionTypeId}
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
                  name="inspectionTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Type ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isEdit}
                          placeholder="Enter inspection type ID"
                          data-testid="input-inspectionTypeId"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inspectionLayout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Layout</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter inspection layout"
                          data-testid="input-inspectionLayout"
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
          inspectionTypeId={inspectionType.inspectionTypeId}
          onSuccess={refetchFormFields}
        />
      )}
    </>
  );
}
