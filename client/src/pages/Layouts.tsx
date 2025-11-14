import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, Edit2, FolderTree } from "lucide-react";

interface Layout {
  id: string;
  layoutId: string;
  companyId: string;
}

interface LayoutZone {
  id: string;
  zoneName: string;
  zoneTag: string | null;
  layoutId: string;
}

interface LayoutZoneComponent {
  id: string;
  componentName: string;
  componentInspectionInstructions: string | null;
  zoneId: string;
}

interface ComponentDefect {
  id: string;
  defectName: string;
  defectMaxSeverity: number;
  defectInstructions: string | null;
  componentId: string;
}

export default function Layouts() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLayoutId, setNewLayoutId] = useState("");
  const [deleteLayoutId, setDeleteLayoutId] = useState<string | null>(null);

  // Fetch layouts
  const { data: layouts = [], isLoading } = useQuery<Layout[]>({
    queryKey: ["/api/layouts", selectedCompany],
    enabled: !!selectedCompany,
  });

  // Create layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      return apiRequest("POST", "/api/layouts", { layoutId, companyId: selectedCompany });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts"] });
      toast({
        title: "Success",
        description: "Layout created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewLayoutId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create layout",
        variant: "destructive",
      });
    },
  });

  // Delete layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/layouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts"] });
      toast({
        title: "Success",
        description: "Layout deleted successfully",
      });
      setDeleteLayoutId(null);
      if (selectedLayout?.id === deleteLayoutId) {
        setSelectedLayout(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete layout",
        variant: "destructive",
      });
      setDeleteLayoutId(null);
    },
  });

  const handleCreateLayout = () => {
    if (!newLayoutId.trim()) {
      toast({
        title: "Error",
        description: "Layout ID is required",
        variant: "destructive",
      });
      return;
    }
    createLayoutMutation.mutate(newLayoutId);
  };

  const handleDeleteLayout = () => {
    if (deleteLayoutId) {
      deleteLayoutMutation.mutate(deleteLayoutId);
    }
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a company to view layouts</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Layout List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Layouts</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-layout">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-layout">
                <DialogHeader>
                  <DialogTitle>Create Layout</DialogTitle>
                  <DialogDescription>
                    Create a new inspection layout configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="layoutId">Layout ID</Label>
                    <Input
                      id="layoutId"
                      placeholder="e.g., TRAILER, TRUCK, PALLET-JACK"
                      value={newLayoutId}
                      onChange={(e) => setNewLayoutId(e.target.value)}
                      data-testid="input-layout-id"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateLayout}
                    disabled={createLayoutMutation.isPending}
                    data-testid="button-confirm-create"
                  >
                    {createLayoutMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Layout List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading layouts...
            </div>
          ) : layouts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No layouts found. Create your first layout to get started.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {layouts.map((layout) => (
                <Card
                  key={layout.id}
                  className={`cursor-pointer hover-elevate active-elevate-2 ${
                    selectedLayout?.id === layout.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedLayout(layout)}
                  data-testid={`card-layout-${layout.layoutId}`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
                          {layout.layoutId}
                        </CardTitle>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLayoutId(layout.id);
                        }}
                        data-testid={`button-delete-layout-${layout.layoutId}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Layout Builder */}
      <div className="flex-1 overflow-auto">
        {selectedLayout ? (
          <LayoutBuilder layout={selectedLayout} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a layout to view and edit its structure</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLayoutId} onOpenChange={() => setDeleteLayoutId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the layout
              and all its zones, components, and defects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLayout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Layout Builder Component
function LayoutBuilder({ layout }: { layout: Layout }) {
  const { toast } = useToast();
  
  // Fetch zones for this layout
  const { data: zones = [], isLoading } = useQuery<LayoutZone[]>({
    queryKey: ["/api/layouts", layout.id, "zones"],
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading layout structure...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">{layout.layoutId}</h2>
        <p className="text-sm text-muted-foreground">
          Configure zones, components, and defects for this layout
        </p>
      </div>

      <ZoneManager layoutId={layout.id} zones={zones} />
    </div>
  );
}

// Zone Manager Component
function ZoneManager({ layoutId, zones }: { layoutId: string; zones: LayoutZone[] }) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneTag, setZoneTag] = useState("");

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: { zoneName: string; zoneTag: string }) => {
      return apiRequest("POST", `/api/layouts/${layoutId}/zones`, { ...data, layoutId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts", layoutId, "zones"] });
      toast({
        title: "Success",
        description: "Zone created successfully",
      });
      setIsCreateDialogOpen(false);
      setZoneName("");
      setZoneTag("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create zone",
        variant: "destructive",
      });
    },
  });

  const handleCreateZone = () => {
    if (!zoneName.trim()) {
      toast({
        title: "Error",
        description: "Zone name is required",
        variant: "destructive",
      });
      return;
    }
    createZoneMutation.mutate({ zoneName, zoneTag });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Zones</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-zone">
              <Plus className="h-4 w-4 mr-1" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-zone">
            <DialogHeader>
              <DialogTitle>Create Zone</DialogTitle>
              <DialogDescription>
                Add a new zone to this layout
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="zoneName">Zone Name</Label>
                <Input
                  id="zoneName"
                  placeholder="e.g., Front Section, Rear Brakes"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  data-testid="input-zone-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoneTag">Zone Tag (Optional)</Label>
                <Input
                  id="zoneTag"
                  placeholder="e.g., FRONT, REAR"
                  value={zoneTag}
                  onChange={(e) => setZoneTag(e.target.value)}
                  data-testid="input-zone-tag"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-zone"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateZone}
                disabled={createZoneMutation.isPending}
                data-testid="button-confirm-zone"
              >
                {createZoneMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {zones.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No zones configured. Add your first zone to start building this layout.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2" data-testid="accordion-zones">
          {zones.map((zone) => (
            <ZoneItem key={zone.id} zone={zone} layoutId={layoutId} />
          ))}
        </Accordion>
      )}
    </div>
  );
}

// Zone Item Component (to be continued with components and defects)
function ZoneItem({ zone, layoutId }: { zone: LayoutZone; layoutId: string }) {
  return (
    <AccordionItem value={zone.id} className="border rounded-lg px-4" data-testid={`zone-${zone.id}`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-medium">{zone.zoneName}</span>
          {zone.zoneTag && (
            <span className="text-xs text-muted-foreground">
              {zone.zoneTag}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Components will be displayed here
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
