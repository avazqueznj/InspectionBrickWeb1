import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Location, type InsertLocation } from "@shared/schema";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { PageFooter } from "@/components/PageFooter";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = "locationName" | "address" | "status";
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: Location[];
  total: number;
  page: number;
  totalPages: number;
}

interface LocationFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export default function Locations() {
  const { selectedCompany } = useCompany();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("locationName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    locationName: "",
    address: "",
    latitude: "",
    longitude: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompany, statusFilter]);

  const { data: filterValues } = useQuery<LocationFilterValues>({
    queryKey: ["/api/locations/filter-values", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      const response = await fetch(`/api/locations/filter-values?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch filter values");
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      return await apiRequest("POST", "/api/locations", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/locations"], exact: false });
      toast({ title: "Success", description: "Location created successfully" });
      setModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create location", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLocation> }) => {
      return await apiRequest("PATCH", `/api/locations/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/locations"], exact: false });
      toast({ title: "Success", description: "Location updated successfully" });
      setModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update location", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/locations"], exact: false });
      toast({ title: "Success", description: "Location deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete location", variant: "destructive" });
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/locations",
      selectedCompany,
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      itemsPerPage,
      statusFilter,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      if (searchQuery) queryParams.set("search", searchQuery);
      if (sortField) queryParams.set("sortField", sortField);
      if (sortDirection) queryParams.set("sortDirection", sortDirection);
      queryParams.set("page", currentPage.toString());
      queryParams.set("limit", itemsPerPage.toString());
      if (statusFilter && statusFilter !== "ALL") {
        queryParams.set("status", statusFilter);
      }
      const response = await fetch(`/api/locations?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  const resetForm = () => {
    setSelectedLocation(null);
    setFormData({
      locationName: "",
      address: "",
      latitude: "",
      longitude: "",
      status: "ACTIVE",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleCreateLocation = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setFormData({
      locationName: location.locationName,
      address: location.address || "",
      latitude: location.latitude || "",
      longitude: location.longitude || "",
      status: location.status,
    });
    setModalOpen(true);
  };

  const handleDeleteLocation = (location: Location) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.locationName.trim()) {
      toast({ title: "Error", description: "Location name is required", variant: "destructive" });
      return;
    }

    const payload: InsertLocation = {
      locationName: formData.locationName.trim(),
      address: formData.address.trim() || null,
      latitude: formData.latitude.trim() || null,
      longitude: formData.longitude.trim() || null,
      status: formData.status,
      companyId: selectedCompany!,
    };

    if (selectedLocation) {
      updateMutation.mutate({ id: selectedLocation.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover-elevate active-elevate-2 px-2 py-1 -ml-2 rounded"
        data-testid={`button-sort-${field}`}
      >
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  const locations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Manage company divisions and sites
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={(value: "ACTIVE" | "INACTIVE" | "ALL") => setStatusFilter(value)}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateLocation} data-testid="button-create-location">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {!isLoading && (
          <div className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {locations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, total)} of {total} locations
          </div>
        )}

        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableHeader field="locationName">Location Name</SortableHeader>
                  <SortableHeader field="address">Address</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Coordinates
                  </th>
                  <SortableHeader field="status">Status</SortableHeader>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4" colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : locations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground">
                        <p className="text-sm">No locations found</p>
                        <p className="text-xs mt-1">Create your first location to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  locations.map((location) => (
                    <tr key={location.id} className="hover-elevate" data-testid={`row-location-${location.id}`}>
                      <td className="px-4 py-4">
                        <span className="font-medium" data-testid={`text-location-name-${location.id}`}>
                          {location.locationName}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground" data-testid={`text-location-address-${location.id}`}>
                          {location.address || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground font-mono">
                          {location.latitude && location.longitude
                            ? `${location.latitude}, ${location.longitude}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={location.status === "ACTIVE" ? "default" : "secondary"}
                          data-testid={`badge-status-${location.id}`}
                        >
                          {location.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditLocation(location)}
                            data-testid={`button-edit-${location.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLocation(location)}
                            data-testid={`button-delete-${location.id}`}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <PageFooter />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLocation ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name *</Label>
              <Input
                id="locationName"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="e.g., Main Depot, North Division"
                data-testid="input-location-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                data-testid="input-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 40.7128"
                  data-testid="input-latitude"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., -74.0060"
                  data-testid="input-longitude"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "ACTIVE" | "INACTIVE") => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLocation?.locationName}"? This action cannot be undone.
              Note: Locations with assigned users or assets cannot be deleted until they are reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLocation && deleteMutation.mutate(selectedLocation.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
