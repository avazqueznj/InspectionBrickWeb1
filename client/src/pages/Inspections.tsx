import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type InspectionWithDefects } from "@shared/schema";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InspectionModal } from "@/components/InspectionModal";
import { FilterBar } from "@/components/FilterBar";
import { Search, ChevronLeft, ChevronRight, Pencil, ArrowUpDown, FileText, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type SortField = "datetime" | "inspectionType" | "assetId" | "driverName";
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: InspectionWithDefects[];
  total: number;
  page: number;
  totalPages: number;
}

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  inspectionType?: string;
  assetId?: string;
  driverName?: string;
  driverId?: string;
}

export default function Inspections() {
  const { selectedCompany } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("datetime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithDefects | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const itemsPerPage = 10;

  // Reset to page 1 when search query, filters, or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery, 
    selectedCompany, 
    filters.dateFrom, 
    filters.dateTo, 
    filters.inspectionType, 
    filters.assetId, 
    filters.driverName, 
    filters.driverId
  ]);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/inspections", 
      selectedCompany, 
      searchQuery, 
      sortField, 
      sortDirection, 
      currentPage, 
      itemsPerPage,
      filters.dateFrom,
      filters.dateTo,
      filters.inspectionType,
      filters.assetId,
      filters.driverName,
      filters.driverId
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      if (searchQuery) queryParams.set("search", searchQuery);
      if (sortField) queryParams.set("sortField", sortField);
      if (sortDirection) queryParams.set("sortDirection", sortDirection);
      queryParams.set("page", currentPage.toString());
      queryParams.set("limit", itemsPerPage.toString());
      
      // Add filter parameters
      if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
      if (filters.inspectionType) queryParams.set("inspectionType", filters.inspectionType);
      if (filters.assetId) queryParams.set("assetId", filters.assetId);
      if (filters.driverName) queryParams.set("driverName", filters.driverName);
      if (filters.driverId) queryParams.set("driverId", filters.driverId);
      
      const response = await fetch(`/api/inspections?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch inspections");
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

  const handleEditClick = (inspection: InspectionWithDefects) => {
    setSelectedInspection(inspection);
    setIsModalOpen(true);
  };

  const handlePrintReport = (inspectionId: string) => {
    // Open in new browser tab
    window.open(`/api/inspections/${inspectionId}/print`, '_blank');
  };

  const handlePrintList = () => {
    // Build query params from current filters
    const queryParams = new URLSearchParams();
    if (selectedCompany) queryParams.set("companyId", selectedCompany);
    if (searchQuery) queryParams.set("search", searchQuery);
    if (sortField) queryParams.set("sortField", sortField);
    if (sortDirection) queryParams.set("sortDirection", sortDirection);
    if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
    if (filters.inspectionType) queryParams.set("inspectionType", filters.inspectionType);
    if (filters.assetId) queryParams.set("assetId", filters.assetId);
    if (filters.driverName) queryParams.set("driverName", filters.driverName);
    if (filters.driverId) queryParams.set("driverId", filters.driverId);
    
    // Open in new browser tab
    window.open(`/api/inspections/print-list?${queryParams.toString()}`, '_blank');
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

  const inspections = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Inspections</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all equipment and vehicle inspections
          </p>
        </div>

        {/* Search Bar and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Button
            variant="default"
            onClick={handlePrintList}
            data-testid="button-print-list"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print List
          </Button>
        </div>

        {/* Filter Bar */}
        <FilterBar companyId={selectedCompany || undefined} onFilterChange={setFilters} />

        {/* Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No inspections found matching your search" : "No inspections yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <SortableHeader field="datetime">Date & Time</SortableHeader>
                      <SortableHeader field="inspectionType">Inspection Type</SortableHeader>
                      <SortableHeader field="assetId">Asset ID</SortableHeader>
                      <SortableHeader field="driverName">Driver Name</SortableHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Driver ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Defects
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inspections.map((inspection) => (
                      <tr
                        key={inspection.id}
                        className="hover-elevate"
                        data-testid={`row-inspection-${inspection.id}`}
                      >
                        <td className="px-4 py-3 text-sm font-mono">
                          {new Date(inspection.datetime).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {inspection.inspectionType}
                        </td>
                        <td className="px-4 py-3 text-sm" data-testid={`text-assetId-${inspection.id}`}>
                          {inspection.assets && inspection.assets.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {inspection.assets.map((assetId, index) => (
                                <span key={index} className="text-xs font-medium font-mono bg-accent px-2 py-0.5 rounded">
                                  {assetId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="font-mono font-medium">{inspection.assetId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inspection.driverName}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {inspection.driverId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-full bg-muted text-xs font-medium">
                            {inspection.defects?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintReport(inspection.id)}
                              data-testid={`button-report-${inspection.id}`}
                              title="Print Report"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(inspection)}
                              data-testid={`button-edit-${inspection.id}`}
                              title="View Details"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, total)} of{" "}
                    {total} inspections
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <InspectionModal
        inspection={selectedInspection}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
