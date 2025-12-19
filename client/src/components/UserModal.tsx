import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser, type UserWithoutPassword } from "@shared/schema";
import { X } from "lucide-react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";

interface UserModalProps {
  user: UserWithoutPassword | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertUser) => void;
  isPending: boolean;
  companies: Array<{ id: string; name: string }>;
  currentCompanyId: string | null;
}

type UserFormData = z.infer<typeof insertUserSchema> & {
  password: string;
};

export function UserModal({ user, open, onOpenChange, onSubmit, isPending, companies, currentCompanyId }: UserModalProps) {
  const isEdit = !!user;

  // Create dynamic schema based on mode
  const userFormSchema = insertUserSchema.extend({
    password: isEdit 
      ? z.string().max(12, "Password must be 12 characters or less").optional() // Optional for edit
      : z.string().min(6, "Password must be at least 6 characters").max(12, "Password must be 12 characters or less"), // Required for create
  });
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      userId: "",
      password: "",
      userFullName: "",
      userTag: "",
      status: "ACTIVE",
      webAccess: false,
      companyId: currentCompanyId,
      locationId: "",
    },
  });

  // Watch the companyId to fetch locations for that company
  const selectedCompanyId = form.watch("companyId");
  
  // Fetch locations for the selected company (inside modal for superuser company switching)
  const { data: locations = [] } = useQuery<Array<{ id: string; locationName: string }>>({
    queryKey: ["/api/locations/simple", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const response = await fetch(`/api/locations/simple?companyId=${selectedCompanyId}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
    enabled: !!selectedCompanyId && open,
  });

  // Track previous companyId to reset locationId when company changes (for superusers switching companies)
  const prevCompanyIdRef = useRef<string | null | undefined>();
  
  useEffect(() => {
    // Only reset if:
    // 1. Modal is open
    // 2. Previous company was set (not initial render)
    // 3. Company has actually changed
    if (open && 
        prevCompanyIdRef.current !== undefined && 
        prevCompanyIdRef.current !== selectedCompanyId) {
      // Company has genuinely changed - reset locationId to prevent stale cross-tenant selection
      form.setValue("locationId", "");
    }
    // Always update the ref
    prevCompanyIdRef.current = selectedCompanyId;
  }, [selectedCompanyId, open, form]);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open && user) {
      form.reset({
        userId: user.userId,
        password: "", // Never pre-fill password
        userFullName: user.userFullName,
        userTag: user.userTag || "",
        status: user.status,
        webAccess: user.webAccess,
        companyId: currentCompanyId, // Always use current company context in edit mode
        locationId: user.locationId || "",
      });
    } else if (!open) {
      form.reset({
        userId: "",
        password: "",
        userFullName: "",
        userTag: "",
        status: "ACTIVE",
        webAccess: false,
        companyId: currentCompanyId, // Default to current company in create mode
        locationId: "",
      });
    }
  }, [open, user, form, currentCompanyId]);

  const handleSubmit = (data: UserFormData) => {
    // For edit mode, if password is empty, don't send it
    if (isEdit && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      onSubmit(dataWithoutPassword as InsertUser);
    } else {
      onSubmit(data as InsertUser);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="modal-user">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEdit ? "Edit User" : "Create User"}
              </DialogTitle>
              {isEdit && (
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {user.userId}
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isEdit}
                          placeholder="Enter user ID"
                          maxLength={64}
                          data-testid="input-userId"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter full name"
                          maxLength={64}
                          data-testid="input-userFullName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Tag (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Enter user tag"
                          maxLength={64}
                          data-testid="input-userTag"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password {isEdit && "(leave blank to keep)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          maxLength={32}
                          placeholder={isEdit ? "Enter new password" : "Enter password"}
                          data-testid="input-password"
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
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-companyId">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Superuser (All Companies)</SelectItem>
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

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-locationId">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.locationName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="webAccess"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 mt-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Web Access</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow this user to log in to the web application
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-webAccess"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-4 flex-shrink-0 border-t mt-4">
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
                {isPending ? "Saving..." : isEdit ? "Update User" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
