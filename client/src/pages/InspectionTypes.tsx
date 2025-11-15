import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type InspectionType, type InspectionTypeWithFormFields, type InsertInspectionType, type Company } from "@shared/schema";
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
import { InspectionTypeModal } from "@/components/InspectionTypeModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = "inspectionTypeName" | "inspectionLayout" | "status";
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: InspectionTypeWithFormFields[];
  total: number;
  page: number;
  totalPages: number;
}

interface InspectionTypeFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export default function InspectionTypes() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("inspectionTypeName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInspectionType, setSelectedInspectionType] = useState<InspectionTypeWithFormFields | null>(null);
  const itemsPerPage = 10;

  // Reset to page 1 when search query, status filter, or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompany, statusFilter]);

  // Fetch filter values
  const { data: filterValues } = useQuery<InspectionTypeFilterValues>({
    queryKey: ["/api/inspection-types/filter-values", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      
      const response = await fetch(`/api/inspection-types/filter-values?${queryParams.toString()}`);
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

  // Create inspection type mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertInspectionType) => {
      return await apiRequest("POST", "/api/inspection-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types"] });
      toast({
        title: "Success",
        description: "Inspection type created successfully",
      });
      setModalOpen(false);
      setSelectedInspectionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inspection type",
        variant: "destructive",
      });
    },
  });

  // Update inspection type mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertInspectionType) => {
      return await apiRequest("PATCH", `/api/inspection-types/${data.inspectionTypeName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-types"] });
      toast({
        title: "Success",
        description: "Inspection type updated successfully",
      });
      setModalOpen(false);
      setSelectedInspectionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inspection type",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/inspection-types",
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
      
      const response = await fetch(`/api/inspection-types?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch inspection types");
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

  const handleCreateInspectionType = () => {
    setSelectedInspectionType(null);
    setModalOpen(true);
  };

  const handleEditInspectionType = (inspectionType: InspectionTypeWithFormFields) => {
    setSelectedInspectionType(inspectionType);
    setModalOpen(true);
  };

  const handleModalSubmit = (data: InsertInspectionType) => {
    if (selectedInspectionType) {
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

  const inspectionTypes = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Inspection Types</h1>
          <p className="text-sm text-muted-foreground">
            Manage inspection type configurations and form fields
          </p>
        </div>

        {/* Search Bar and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspection types..."
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

          <Button onClick={handleCreateInspectionType} data-testid="button-create-inspection-type">
            <Plus className="h-4 w-4 mr-2" />
            Create Inspection Type
          </Button>
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {inspectionTypes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, total)} of {total} inspection types
          </div>
        )}

        {/* Inspection Types Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableHeader field="inspectionTypeName">Inspection Type Name</SortableHeader>
                  <SortableHeader field="inspectionLayout">Inspection Layout</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Company
                  </th>
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
                ) : inspectionTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground">
                        <p className="text-sm">No inspection types found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspectionTypes.map((inspectionType) => (
                    <tr 
                      key={inspectionType.inspectionTypeName} 
                      className="hover-elevate"
                      data-testid={`row-inspection-type-${inspectionType.inspectionTypeName}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm" data-testid={`text-inspectionTypeName-${inspectionType.inspectionTypeName}`}>
                          {inspectionType.inspectionTypeName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono" data-testid={`text-inspectionLayout-${inspectionType.inspectionTypeName}`}>
                          {inspectionType.layoutNames || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={inspectionType.status === "ACTIVE" ? "default" : "secondary"}
                          data-testid={`badge-status-${inspectionType.inspectionTypeName}`}
                        >
                          {inspectionType.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm" data-testid={`text-companyId-${inspectionType.inspectionTypeName}`}>
                          {inspectionType.companyId}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditInspectionType(inspectionType)}
                          data-testid={`button-edit-${inspectionType.inspectionTypeName}`}
                          title="Edit Inspection Type"
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

      {/* Inspection Type Create/Edit Modal */}
      <InspectionTypeModal
        inspectionType={selectedInspectionType}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleModalSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        companies={companies}
        currentCompanyId={selectedCompany}
      />
    </div>
  );
}
