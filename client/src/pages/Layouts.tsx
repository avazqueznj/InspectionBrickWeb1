import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
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
import { Plus, Trash2, Edit2, FolderTree, Pencil, ImageIcon, Upload, X } from "lucide-react";

interface Layout {
  id: string;
  layoutName: string;
  companyId: string;
}

interface LayoutZone {
  id: string;
  zoneName: string;
  zoneTag: string | null;
  layoutId: string;
  imageId: string | null;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [deleteLayoutId, setDeleteLayoutId] = useState<string | null>(null);
  
  // Authorization check: only superusers or users with customerAdminAccess can access this page
  if (user && !user.isSuperuser && !user.customerAdminAccess) {
    return <Redirect to="/" />;
  }

  // Fetch layouts
  const { data: layouts = [], isLoading } = useQuery<Layout[]>({
    queryKey: ["/api/layouts", { companyId: selectedCompany }],
    enabled: !!selectedCompany,
    queryFn: async () => {
      const url = selectedCompany 
        ? `/api/layouts?companyId=${selectedCompany}`
        : "/api/layouts";
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
  });

  // Create layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: async (layoutName: string) => {
      return apiRequest("POST", "/api/layouts", { layoutName, companyId: selectedCompany });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts"] });
      toast({
        title: "Success",
        description: "Layout created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewLayoutName("");
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
    if (!newLayoutName.trim()) {
      toast({
        title: "Error",
        description: "Layout Name is required",
        variant: "destructive",
      });
      return;
    }
    createLayoutMutation.mutate(newLayoutName);
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
                    <Label htmlFor="layoutName">Layout Name</Label>
                    <Input
                      id="layoutName"
                      placeholder="e.g., TRAILER, TRUCK, PALLET-JACK"
                      value={newLayoutName}
                      onChange={(e) => setNewLayoutName(e.target.value)}
                      maxLength={64}
                      data-testid="input-layout-name"
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
                  data-testid={`card-layout-${layout.layoutName}`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
                          {layout.layoutName}
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
                        data-testid={`button-delete-layout-${layout.layoutName}`}
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
        <h2 className="text-2xl font-semibold mb-2">{layout.layoutName}</h2>
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
                  maxLength={64}
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
                  maxLength={64}
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

// Zone Item Component with Components Management
function ZoneItem({ zone, layoutId }: { zone: LayoutZone; layoutId: string }) {
  const { toast } = useToast();
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editZoneName, setEditZoneName] = useState(zone.zoneName);
  const [editZoneTag, setEditZoneTag] = useState(zone.zoneTag || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Sync edit state when dialog opens or zone props change
  useEffect(() => {
    if (isEditDialogOpen) {
      setEditZoneName(zone.zoneName);
      setEditZoneTag(zone.zoneTag || "");
    }
  }, [isEditDialogOpen, zone.zoneName, zone.zoneTag]);

  // Fetch components for this zone
  const { data: components = [] } = useQuery<LayoutZoneComponent[]>({
    queryKey: ["/api/zones", zone.id, "components"],
  });

  // Update zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: async (data: { zoneName: string; zoneTag: string }) => {
      return apiRequest("PATCH", `/api/zones/${zone.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts", layoutId, "zones"] });
      toast({
        title: "Success",
        description: "Zone updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive",
      });
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts", layoutId, "zones"] });
      toast({
        title: "Success",
        description: "Zone deleted successfully",
      });
      setDeleteZoneId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete zone",
        variant: "destructive",
      });
      setDeleteZoneId(null);
    },
  });

  // Upload zone image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (data: { imageData: string }) => {
      return apiRequest("POST", `/api/zones/${zone.id}/image`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts", layoutId, "zones"] });
      toast({
        title: "Success",
        description: "Zone image uploaded successfully",
      });
      setIsUploadingImage(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      setIsUploadingImage(false);
    },
  });

  // Delete zone image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/zones/${zone.id}/image`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layouts", layoutId, "zones"] });
      toast({
        title: "Success",
        description: "Zone image deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPEG image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);

    // Load image to get dimensions
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      // Client-side pre-validation for UX (server validates authoritatively)
      if (img.width > 800 || img.height > 400) {
        toast({
          title: "Image Too Large",
          description: `Maximum dimensions are 800x400 pixels. Your image is ${img.width}x${img.height}.`,
          variant: "destructive",
        });
        setIsUploadingImage(false);
        return;
      }

      // Convert to base64 and upload
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      uploadImageMutation.mutate({
        imageData: base64,
      });
    };

    img.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load image",
        variant: "destructive",
      });
      setIsUploadingImage(false);
    };

    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleUpdateZone = () => {
    if (!editZoneName.trim()) {
      toast({
        title: "Error",
        description: "Zone name is required",
        variant: "destructive",
      });
      return;
    }
    updateZoneMutation.mutate({ zoneName: editZoneName, zoneTag: editZoneTag });
  };

  return (
    <>
      <AccordionItem value={zone.id} className="border rounded-lg px-4" data-testid={`zone-${zone.id}`}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">{zone.zoneName}</span>
              {zone.zoneTag && (
                <span className="text-xs px-2 py-1 bg-muted rounded">
                  {zone.zoneTag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditDialogOpen(true);
                }}
                data-testid={`button-edit-zone-${zone.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteZoneId(zone.id);
                }}
                data-testid={`button-delete-zone-${zone.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-4 space-y-4">
            {/* Zone Image Section */}
            <div className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0">
                {zone.imageId ? (
                  <div className="relative group">
                    <img
                      src={`/api/zones/${zone.id}/image?v=${zone.imageId}`}
                      alt={`${zone.zoneName} reference`}
                      className="w-24 h-16 object-cover rounded border border-border"
                      data-testid={`img-zone-${zone.id}`}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-16 bg-muted/50 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Zone Reference Image</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {zone.imageId 
                    ? "Image helps drivers identify this inspection zone"
                    : "Add an image to help drivers identify this zone (max 800x400 JPEG)"
                  }
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id={`zone-image-${zone.id}`}
                    accept="image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isUploadingImage || uploadImageMutation.isPending}
                    data-testid={`input-zone-image-${zone.id}`}
                  />
                  <Button
                    size="sm"
                    variant={zone.imageId ? "outline" : "default"}
                    onClick={() => document.getElementById(`zone-image-${zone.id}`)?.click()}
                    disabled={isUploadingImage || uploadImageMutation.isPending}
                    data-testid={`button-upload-zone-image-${zone.id}`}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {isUploadingImage || uploadImageMutation.isPending 
                      ? "Uploading..." 
                      : zone.imageId ? "Replace" : "Upload"
                    }
                  </Button>
                  {zone.imageId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteImageMutation.mutate()}
                      disabled={deleteImageMutation.isPending}
                      data-testid={`button-delete-zone-image-${zone.id}`}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      {deleteImageMutation.isPending ? "Deleting..." : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Components Section */}
            <ComponentManager zoneId={zone.id} components={components} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Edit Zone Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-zone">
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
            <DialogDescription>
              Update the zone name and tag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editZoneName">Zone Name</Label>
              <Input
                id="editZoneName"
                value={editZoneName}
                onChange={(e) => setEditZoneName(e.target.value)}
                maxLength={64}
                data-testid="input-edit-zone-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editZoneTag">Zone Tag (Optional)</Label>
              <Input
                id="editZoneTag"
                value={editZoneTag}
                onChange={(e) => setEditZoneTag(e.target.value)}
                maxLength={64}
                data-testid="input-edit-zone-tag"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit-zone"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateZone}
              disabled={updateZoneMutation.isPending}
              data-testid="button-confirm-edit-zone"
            >
              {updateZoneMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog open={deleteZoneId === zone.id} onOpenChange={() => setDeleteZoneId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-zone">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{zone.zoneName}" and all its components and defects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-zone">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteZoneMutation.mutate(zone.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-zone"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Component Manager
function ComponentManager({ zoneId, components }: { zoneId: string; components: LayoutZoneComponent[] }) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [componentName, setComponentName] = useState("");
  const [instructions, setInstructions] = useState("");

  // Create component mutation
  const createComponentMutation = useMutation({
    mutationFn: async (data: { componentName: string; componentInspectionInstructions: string }) => {
      return apiRequest("POST", `/api/zones/${zoneId}/components`, { ...data, zoneId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones", zoneId, "components"] });
      toast({
        title: "Success",
        description: "Component created successfully",
      });
      setIsCreateDialogOpen(false);
      setComponentName("");
      setInstructions("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create component",
        variant: "destructive",
      });
    },
  });

  const handleCreateComponent = () => {
    if (!componentName.trim()) {
      toast({
        title: "Error",
        description: "Component name is required",
        variant: "destructive",
      });
      return;
    }
    createComponentMutation.mutate({ 
      componentName, 
      componentInspectionInstructions: instructions 
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Components</h4>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid={`button-add-component-${zoneId}`}>
              <Plus className="h-3 w-3 mr-1" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-component">
            <DialogHeader>
              <DialogTitle>Create Component</DialogTitle>
              <DialogDescription>
                Add a new inspectable component to this zone
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="componentName">Component Name</Label>
                <Input
                  id="componentName"
                  placeholder="e.g., Brake Lights, Tires, Windshield"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  maxLength={64}
                  data-testid="input-component-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Inspection Instructions (Optional)</Label>
                <Input
                  id="instructions"
                  placeholder="e.g., Check for cracks or damage"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={128}
                  data-testid="input-component-instructions"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-component"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateComponent}
                disabled={createComponentMutation.isPending}
                data-testid="button-confirm-component"
              >
                {createComponentMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {components.length === 0 ? (
        <p className="text-sm text-muted-foreground">No components added yet</p>
      ) : (
        <div className="space-y-2">
          {components.map((component) => (
            <ComponentItem key={component.id} component={component} zoneId={zoneId} />
          ))}
        </div>
      )}
    </div>
  );
}

// Component Item
function ComponentItem({ component, zoneId }: { component: LayoutZoneComponent; zoneId: string }) {
  const { toast } = useToast();
  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editComponentName, setEditComponentName] = useState(component.componentName);
  const [editInstructions, setEditInstructions] = useState(component.componentInspectionInstructions || "");

  // Sync edit state when dialog opens or component props change
  useEffect(() => {
    if (isEditDialogOpen) {
      setEditComponentName(component.componentName);
      setEditInstructions(component.componentInspectionInstructions || "");
    }
  }, [isEditDialogOpen, component.componentName, component.componentInspectionInstructions]);

  // Fetch defects for this component
  const { data: defects = [] } = useQuery<ComponentDefect[]>({
    queryKey: ["/api/components", component.id, "defects"],
    enabled: isExpanded,
  });

  // Update component mutation
  const updateComponentMutation = useMutation({
    mutationFn: async (data: { componentName: string; componentInspectionInstructions: string }) => {
      return apiRequest("PATCH", `/api/components/${component.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones", zoneId, "components"] });
      toast({
        title: "Success",
        description: "Component updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update component",
        variant: "destructive",
      });
    },
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/components/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones", zoneId, "components"] });
      toast({
        title: "Success",
        description: "Component deleted successfully",
      });
      setDeleteComponentId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete component",
        variant: "destructive",
      });
      setDeleteComponentId(null);
    },
  });

  const handleUpdateComponent = () => {
    if (!editComponentName.trim()) {
      toast({
        title: "Error",
        description: "Component name is required",
        variant: "destructive",
      });
      return;
    }
    updateComponentMutation.mutate({ 
      componentName: editComponentName, 
      componentInspectionInstructions: editInstructions 
    });
  };

  return (
    <>
      <Card className="bg-muted/50" data-testid={`component-${component.id}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{component.componentName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setIsExpanded(!isExpanded)}
                  data-testid={`button-toggle-defects-${component.id}`}
                >
                  {isExpanded ? "Hide" : "Show"} Defects
                </Button>
              </div>
              {component.componentInspectionInstructions && (
                <p className="text-xs text-muted-foreground mt-1">
                  {component.componentInspectionInstructions}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsEditDialogOpen(true)}
                data-testid={`button-edit-component-${component.id}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setDeleteComponentId(component.id)}
                data-testid={`button-delete-component-${component.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t">
              <DefectManager componentId={component.id} defects={defects} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Component Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-component">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              Update the component name and inspection instructions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editComponentName">Component Name</Label>
              <Input
                id="editComponentName"
                value={editComponentName}
                onChange={(e) => setEditComponentName(e.target.value)}
                maxLength={64}
                data-testid="input-edit-component-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInstructions">Inspection Instructions (Optional)</Label>
              <Input
                id="editInstructions"
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                maxLength={128}
                data-testid="input-edit-component-instructions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit-component"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateComponent}
              disabled={updateComponentMutation.isPending}
              data-testid="button-confirm-edit-component"
            >
              {updateComponentMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Component Confirmation */}
      <AlertDialog open={deleteComponentId === component.id} onOpenChange={() => setDeleteComponentId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-component">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{component.componentName}" and all its defects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-component">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteComponentMutation.mutate(component.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-component"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Defect Manager
function DefectManager({ componentId, defects }: { componentId: string; defects: ComponentDefect[] }) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [defectName, setDefectName] = useState("");
  const [maxSeverity, setMaxSeverity] = useState("5");
  const [defectInstructions, setDefectInstructions] = useState("");

  // Create defect mutation
  const createDefectMutation = useMutation({
    mutationFn: async (data: { defectName: string; defectMaxSeverity: number; defectInstructions: string }) => {
      return apiRequest("POST", `/api/components/${componentId}/defects`, { ...data, componentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components", componentId, "defects"] });
      toast({
        title: "Success",
        description: "Defect created successfully",
      });
      setIsCreateDialogOpen(false);
      setDefectName("");
      setMaxSeverity("5");
      setDefectInstructions("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create defect",
        variant: "destructive",
      });
    },
  });

  const handleCreateDefect = () => {
    if (!defectName.trim()) {
      toast({
        title: "Error",
        description: "Defect name is required",
        variant: "destructive",
      });
      return;
    }
    const severity = parseInt(maxSeverity);
    if (isNaN(severity) || severity < 1 || severity > 10) {
      toast({
        title: "Error",
        description: "Max severity must be between 1 and 10",
        variant: "destructive",
      });
      return;
    }
    createDefectMutation.mutate({ 
      defectName, 
      defectMaxSeverity: severity,
      defectInstructions 
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold">Possible Defects</h5>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`button-add-defect-${componentId}`}>
              <Plus className="h-3 w-3 mr-1" />
              Add Defect
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-defect">
            <DialogHeader>
              <DialogTitle>Create Defect</DialogTitle>
              <DialogDescription>
                Add a possible defect for this component
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="defectName">Defect Name</Label>
                <Input
                  id="defectName"
                  placeholder="e.g., Cracked lens, Worn tread"
                  value={defectName}
                  onChange={(e) => setDefectName(e.target.value)}
                  maxLength={64}
                  data-testid="input-defect-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSeverity">Maximum Severity (1-10)</Label>
                <Input
                  id="maxSeverity"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="5"
                  value={maxSeverity}
                  onChange={(e) => setMaxSeverity(e.target.value)}
                  data-testid="input-defect-severity"
                />
                <p className="text-xs text-muted-foreground">
                  Critical: 8-10 | High: 6-7 | Medium: 4-5 | Low: 1-3
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defectInstructions">Instructions (Optional)</Label>
                <Input
                  id="defectInstructions"
                  placeholder="e.g., Measure tread depth"
                  value={defectInstructions}
                  onChange={(e) => setDefectInstructions(e.target.value)}
                  maxLength={128}
                  data-testid="input-defect-instructions"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-defect"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDefect}
                disabled={createDefectMutation.isPending}
                data-testid="button-confirm-defect"
              >
                {createDefectMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {defects.length === 0 ? (
        <p className="text-xs text-muted-foreground">No defects defined</p>
      ) : (
        <div className="space-y-1">
          {defects.map((defect) => (
            <DefectItem key={defect.id} defect={defect} componentId={componentId} />
          ))}
        </div>
      )}
    </div>
  );
}

// Defect Item
function DefectItem({ defect, componentId }: { defect: ComponentDefect; componentId: string }) {
  const { toast } = useToast();
  const [deleteDefectId, setDeleteDefectId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDefectName, setEditDefectName] = useState(defect.defectName);
  const [editMaxSeverity, setEditMaxSeverity] = useState(defect.defectMaxSeverity.toString());
  const [editDefectInstructions, setEditDefectInstructions] = useState(defect.defectInstructions || "");

  // Sync edit state when dialog opens or defect props change
  useEffect(() => {
    if (isEditDialogOpen) {
      setEditDefectName(defect.defectName);
      setEditMaxSeverity(defect.defectMaxSeverity.toString());
      setEditDefectInstructions(defect.defectInstructions || "");
    }
  }, [isEditDialogOpen, defect.defectName, defect.defectMaxSeverity, defect.defectInstructions]);

  // Update defect mutation
  const updateDefectMutation = useMutation({
    mutationFn: async (data: { defectName: string; defectMaxSeverity: number; defectInstructions: string }) => {
      return apiRequest("PATCH", `/api/component-defects/${defect.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components", componentId, "defects"] });
      toast({
        title: "Success",
        description: "Defect updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update defect",
        variant: "destructive",
      });
    },
  });

  // Delete defect mutation
  const deleteDefectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/component-defects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components", componentId, "defects"] });
      toast({
        title: "Success",
        description: "Defect deleted successfully",
      });
      setDeleteDefectId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete defect",
        variant: "destructive",
      });
      setDeleteDefectId(null);
    },
  });

  const handleUpdateDefect = () => {
    if (!editDefectName.trim()) {
      toast({
        title: "Error",
        description: "Defect name is required",
        variant: "destructive",
      });
      return;
    }
    const severity = parseInt(editMaxSeverity);
    if (isNaN(severity) || severity < 1 || severity > 10) {
      toast({
        title: "Error",
        description: "Max severity must be between 1 and 10",
        variant: "destructive",
      });
      return;
    }
    updateDefectMutation.mutate({ 
      defectName: editDefectName, 
      defectMaxSeverity: severity,
      defectInstructions: editDefectInstructions
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return "text-red-500";
    if (severity >= 6) return "text-orange-500";
    if (severity >= 4) return "text-yellow-500";
    return "text-blue-500";
  };

  return (
    <>
      <div className="flex items-center justify-between text-xs p-2 bg-background rounded border" data-testid={`defect-${defect.id}`}>
        <div className="flex-1">
          <span>{defect.defectName}</span>
          {defect.defectInstructions && (
            <span className="text-muted-foreground ml-2">• {defect.defectInstructions}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getSeverityColor(defect.defectMaxSeverity)}`}>
            Max: {defect.defectMaxSeverity}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setIsEditDialogOpen(true)}
            data-testid={`button-edit-defect-${defect.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setDeleteDefectId(defect.id)}
            data-testid={`button-delete-defect-${defect.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Edit Defect Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-defect">
          <DialogHeader>
            <DialogTitle>Edit Defect</DialogTitle>
            <DialogDescription>
              Update the defect name, severity, and instructions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDefectName">Defect Name</Label>
              <Input
                id="editDefectName"
                value={editDefectName}
                onChange={(e) => setEditDefectName(e.target.value)}
                maxLength={64}
                data-testid="input-edit-defect-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editMaxSeverity">Maximum Severity (1-10)</Label>
              <Input
                id="editMaxSeverity"
                type="number"
                min="1"
                max="10"
                value={editMaxSeverity}
                onChange={(e) => setEditMaxSeverity(e.target.value)}
                data-testid="input-edit-defect-severity"
              />
              <p className="text-xs text-muted-foreground">
                Critical: 8-10 | High: 6-7 | Medium: 4-5 | Low: 1-3
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDefectInstructions">Instructions (Optional)</Label>
              <Input
                id="editDefectInstructions"
                value={editDefectInstructions}
                onChange={(e) => setEditDefectInstructions(e.target.value)}
                maxLength={128}
                data-testid="input-edit-defect-instructions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit-defect"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDefect}
              disabled={updateDefectMutation.isPending}
              data-testid="button-confirm-edit-defect"
            >
              {updateDefectMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Defect Confirmation */}
      <AlertDialog open={deleteDefectId === defect.id} onOpenChange={() => setDeleteDefectId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-defect">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Defect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{defect.defectName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-defect">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDefectMutation.mutate(defect.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-defect"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
