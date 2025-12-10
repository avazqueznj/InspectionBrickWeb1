import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type InsertAsset, type Asset, type Layout } from "@shared/schema";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AssetModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertAsset) => void;
  isPending: boolean;
  companies: Array<{ id: string; name: string }>;
  currentCompanyId: string | null;
}

export function AssetModal({ asset, open, onOpenChange, onSubmit, isPending, companies, currentCompanyId }: AssetModalProps) {
  const isEdit = !!asset;
  const isSuperuser = !currentCompanyId;
  
  const form = useForm<InsertAsset>({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      assetId: "",
      layout: "",
      assetName: "",
      licensePlate: "",
      status: "ACTIVE",
      companyId: currentCompanyId || "",
    },
  });

  // Watch the selected companyId to fetch layouts for that company
  const selectedCompanyId = form.watch("companyId");
  
  // Track previous companyId to detect actual changes
  const prevCompanyIdRef = useRef<string | undefined>();
  
  // Fetch layouts for the selected company
  const { data: layouts = [] } = useQuery<Layout[]>({
    queryKey: ["/api/layouts", selectedCompanyId],
    queryFn: async () => {
      const response = await fetch(`/api/layouts?companyId=${selectedCompanyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch layouts");
      }
      return response.json();
    },
    enabled: !!selectedCompanyId && open,
  });

  // Reset layout field when company actually changes to prevent cross-tenant layout selection
  useEffect(() => {
    // Only reset if:
    // 1. Modal is open
    // 2. Previous company was set (not initial render/open)
    // 3. Company has actually changed
    // 4. Both old and new company IDs are non-empty (user has made a selection)
    if (open && 
        prevCompanyIdRef.current !== undefined && 
        prevCompanyIdRef.current !== "" &&
        selectedCompanyId !== "" &&
        prevCompanyIdRef.current !== selectedCompanyId) {
      // Company has genuinely changed - reset layout to prevent stale cross-tenant selection
      form.setValue("layout", "");
    }
    // Only update the ref if we have a meaningful value
    if (selectedCompanyId) {
      prevCompanyIdRef.current = selectedCompanyId;
    }
  }, [selectedCompanyId, form, open]);

  // Reset form when modal opens/closes or asset changes
  useEffect(() => {
    if (open && asset) {
      // In edit mode, preserve the asset's company
      form.reset({
        assetId: asset.assetId,
        layout: asset.layout,
        assetName: asset.assetName,
        licensePlate: asset.licensePlate || "",
        status: asset.status,
        companyId: asset.companyId,
      });
      // Initialize the ref with the asset's company to prevent false change detection
      prevCompanyIdRef.current = asset.companyId;
    } else if (open && !asset) {
      // In create mode, use user's company (or empty for superusers to select)
      form.reset({
        assetId: "",
        layout: "",
        assetName: "",
        licensePlate: "",
        status: "ACTIVE",
        companyId: currentCompanyId || "",
      });
      // Initialize the ref with the current company
      prevCompanyIdRef.current = currentCompanyId || "";
    } else if (!open) {
      // Reset form when modal closes
      form.reset({
        assetId: "",
        layout: "",
        assetName: "",
        licensePlate: "",
        status: "ACTIVE",
        companyId: "",
      });
      // Reset the ref when modal closes
      prevCompanyIdRef.current = undefined;
    }
  }, [open, asset, form, currentCompanyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="modal-asset">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEdit ? "Edit Asset" : "Create Asset"}
              </DialogTitle>
              {isEdit && (
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {asset.assetId}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isEdit}
                          placeholder="e.g., N1234"
                          maxLength={64}
                          data-testid="input-assetId"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., BUS 1"
                          maxLength={64}
                          data-testid="input-assetName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-layout">
                            <SelectValue placeholder={selectedCompanyId ? "Select layout" : "Select a company first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {layouts.map((layout) => (
                            <SelectItem key={layout.id} value={layout.id} data-testid={`select-option-layout-${layout.layoutName}`}>
                              {layout.layoutName}
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
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="e.g., ABC-1234"
                          maxLength={20}
                          data-testid="input-licensePlate"
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
                        value={field.value}
                        disabled={!isSuperuser}
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
                {isPending ? "Saving..." : isEdit ? "Update Asset" : "Create Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
