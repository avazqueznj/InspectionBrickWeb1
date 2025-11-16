import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Location, type InsertLocation } from "@shared/schema";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationModal } from "@/components/LocationModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function Locations() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      
      const response = await fetch(`/api/locations?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      return await apiRequest("POST", "/api/locations", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/locations"],
        exact: false 
      });
      toast({
        title: "Success",
        description: "Location created successfully",
      });
      setModalOpen(false);
      setSelectedLocation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertLocation & { originalLocationName?: string }) => {
      const { originalLocationName, ...updateData } = data;
      const locationName = originalLocationName || data.locationName;
      return await apiRequest("PATCH", `/api/locations/${encodeURIComponent(locationName)}?companyId=${data.companyId}`, updateData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/locations"],
        exact: false 
      });
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
      setModalOpen(false);
      setSelectedLocation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteMutation = useMutation({
    mutationFn: async (location: Location) => {
      return await apiRequest("DELETE", `/api/locations/${encodeURIComponent(location.locationName)}?companyId=${location.companyId}`, undefined);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/locations"],
        exact: false 
      });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  const handleCreateLocation = () => {
    setSelectedLocation(null);
    setModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setModalOpen(true);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete);
    }
  };

  const filteredLocations = locations.filter((location) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.locationName.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query) ||
      location.locationDotNumber?.toLowerCase().includes(query)
    );
  });

  if (!selectedCompany) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Please select a company to view locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your company locations
          </p>
        </div>
        <Button onClick={handleCreateLocation} data-testid="button-create-location">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-location"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No locations found matching your search" : "No locations found. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Location Name</th>
                  <th className="text-left p-4 font-medium">Address</th>
                  <th className="text-left p-4 font-medium">DOT Number</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => (
                  <tr key={`${location.locationName}-${location.companyId}`} className="border-b last:border-0 hover-elevate">
                    <td className="p-4 font-medium" data-testid={`text-location-name-${location.locationName}`}>
                      {location.locationName}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {location.address || "-"}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {location.locationDotNumber || "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditLocation(location)}
                          data-testid={`button-edit-location-${location.locationName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(location)}
                          data-testid={`button-delete-location-${location.locationName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LocationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        location={selectedLocation}
        onSubmit={(data: InsertLocation) => {
          if (selectedLocation) {
            updateMutation.mutate({ ...data, originalLocationName: selectedLocation.locationName });
          } else {
            createMutation.mutate(data);
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.locationName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
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
