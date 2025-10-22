import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser, type UserWithoutPassword } from "@shared/schema";
import { X } from "lucide-react";
import { z } from "zod";

interface UserModalProps {
  user: UserWithoutPassword | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertUser) => void;
  isPending: boolean;
  companies: Array<{ id: string; name: string }>;
}

type UserFormData = z.infer<typeof insertUserSchema> & {
  password: string;
};

export function UserModal({ user, open, onOpenChange, onSubmit, isPending, companies }: UserModalProps) {
  const isEdit = !!user;

  // Create dynamic schema based on mode
  const userFormSchema = insertUserSchema.extend({
    password: isEdit 
      ? z.string().optional() // Optional for edit
      : z.string().min(6, "Password must be at least 6 characters"), // Required for create
  });
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      userId: "",
      password: "",
      userFullName: "",
      status: "ACTIVE",
      companyId: null,
    },
  });

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open && user) {
      form.reset({
        userId: user.userId,
        password: "", // Never pre-fill password
        userFullName: user.userFullName,
        status: user.status,
        companyId: user.companyId,
      });
    } else if (!open) {
      form.reset({
        userId: "",
        password: "",
        userFullName: "",
        status: "ACTIVE",
        companyId: null,
      });
    }
  }, [open, user, form]);

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
      <DialogContent className="max-w-md" data-testid="modal-user">
        <DialogHeader>
          <div className="flex items-start justify-between">
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
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
                      data-testid="input-userFullName"
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
                    Password {isEdit && "(leave blank to keep unchanged)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
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

            <div className="flex gap-2 pt-4">
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
