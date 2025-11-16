import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type InsertLocation, type Location } from "@shared/schema";
import { X } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

interface LocationModalProps {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertLocation) => void;
  isPending: boolean;
}

export function LocationModal({ location, open, onOpenChange, onSubmit, isPending }: LocationModalProps) {
  const { selectedCompany } = useCompany();
  const isEdit = !!location;

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      locationName: "",
      companyId: selectedCompany || "",
      address: "",
      locationDotNumber: "",
    },
  });

  // Reset form when modal opens/closes or location changes
  useEffect(() => {
    if (open && location) {
      form.reset({
        locationName: location.locationName,
        companyId: location.companyId,
        address: location.address || "",
        locationDotNumber: location.locationDotNumber || "",
      });
    } else if (!open) {
      form.reset({
        locationName: "",
        companyId: selectedCompany || "",
        address: "",
        locationDotNumber: "",
      });
    }
  }, [open, location, form, selectedCompany]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-location">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEdit ? "Edit Location" : "Create Location"}
              </DialogTitle>
              {isEdit && (
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {location.locationName}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isEdit}
                      placeholder="Enter location name"
                      data-testid="input-locationName"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter address"
                      data-testid="input-address"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationDotNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DOT Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter DOT number"
                      data-testid="input-locationDotNumber"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
