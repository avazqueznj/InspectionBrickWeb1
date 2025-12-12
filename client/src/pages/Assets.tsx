import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Asset, type InsertAsset, type Company } from "@shared/schema";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Plus, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssetModal } from "@/components/AssetModal";
import { PageFooter } from "@/components/PageFooter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = "assetId" | "assetConfig" | "assetName" | "status";

// Extended asset type with layoutName for display
type AssetWithLayout = Asset & { layoutName?: string };
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: AssetWithLayout[];
  total: number;
  page: number;
  totalPages: number;
}

interface AssetFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export default function Assets() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("assetId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const itemsPerPage = 10;

  // Reset to page 1 when search query, status filter, or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompany, statusFilter]);

  // Fetch filter values
  const { data: filterValues } = useQuery<AssetFilterValues>({
    queryKey: ["/api/assets/filter-values", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      
      const response = await fetch(`/api/assets/filter-values?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch filter values");
      }
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  // Fetch companies for the modal
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Fetch current user to determine if they're a superuser
  const { data: currentUser } = useQuery<{ userId: string; companyId: string | null }>({
    queryKey: ["/api/auth/user"],
  });

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertAsset) => {
      return await apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      setModalOpen(false);
      setSelectedAsset(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create asset",
        variant: "destructive",
      });
    },
  });

  // Update asset mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertAsset) => {
      return await apiRequest("PATCH", `/api/assets/${data.assetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset updated successfully",
      });
      setModalOpen(false);
      setSelectedAsset(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/assets",
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
      
      // Add status filter (skip if "ALL")
      if (statusFilter && statusFilter !== "ALL") {
        queryParams.set("status", statusFilter);
      }
      
      const response = await fetch(`/api/assets?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleCreateAsset = () => {
    setSelectedAsset(null);
    setModalOpen(true);
  };

  const handleEditAsset = (asset: AssetWithLayout) => {
    setSelectedAsset(asset);
    setModalOpen(true);
  };

  const handleModalSubmit = (data: InsertAsset) => {
    if (selectedAsset) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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

  const assets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Manage vehicles, equipment, and other assets
          </p>
        </div>

        {/* Search Bar and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
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

          <Button onClick={handleCreateAsset} data-testid="button-create-asset">
            <Plus className="h-4 w-4 mr-2" />
            Create Asset
          </Button>
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {assets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, total)} of {total} assets
          </div>
        )}

        {/* Assets Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableHeader field="assetId">Asset ID</SortableHeader>
                  <SortableHeader field="assetConfig">Layout</SortableHeader>
                  <SortableHeader field="assetName">Name</SortableHeader>
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
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground">
                        <p className="text-sm">No assets found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr 
                      key={asset.assetId} 
                      className="hover-elevate"
                      data-testid={`row-asset-${asset.assetId}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm" data-testid={`text-assetId-${asset.assetId}`}>
                          {asset.assetId}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono" data-testid={`text-layout-${asset.assetId}`}>
                          {asset.layoutName || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium" data-testid={`text-assetName-${asset.assetId}`}>
                          {asset.assetName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={asset.status === "ACTIVE" ? "default" : "secondary"}
                          data-testid={`badge-status-${asset.assetId}`}
                        >
                          {asset.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAsset(asset)}
                          data-testid={`button-edit-${asset.assetId}`}
                          title="Edit Asset"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Create/Edit Modal */}
      <AssetModal
        asset={selectedAsset}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleModalSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        companies={companies}
        currentCompanyId={currentUser?.companyId || null}
      />
      
      <PageFooter />
    </div>
  );
}
