import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type DefectWithInspection, type InspectionWithDefects } from "@shared/schema";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InspectionModal } from "@/components/InspectionModal";
import { RepairDialog } from "@/components/RepairDialog";

type SortField = "datetime" | "assetId" | "driverName" | "zoneName" | "componentName" | "defect" | "severity" | "status" | "mechanicName" | "repairDate";
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: DefectWithInspection[];
  total: number;
  page: number;
  totalPages: number;
}

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  assetId?: string;
  driverName?: string;
  zoneName?: string;
  componentName?: string;
  severityLevel?: "critical" | "high" | "medium" | "low";
  status?: "open" | "pending" | "repaired" | "not-needed";
}

interface FilterValues {
  assetIds: string[];
  driverNames: string[];
  zoneNames: string[];
  componentNames: string[];
  severityLevels: ("critical" | "high" | "medium" | "low")[];
  statuses: ("open" | "pending" | "repaired" | "not-needed")[];
}

export default function Defects() {
  const { selectedCompany } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<Filters>({ status: "open" });
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDefectIds, setSelectedDefectIds] = useState<Set<string>>(new Set());
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const itemsPerPage = 10;

  // Reset to page 1 when search query, filters, or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCompany,
    filters.dateFrom,
    filters.dateTo,
    filters.assetId,
    filters.driverName,
    filters.zoneName,
    filters.componentName,
    filters.severityLevel,
    filters.status
  ]);

  // Fetch filter values
  const { data: filterValues } = useQuery<FilterValues>({
    queryKey: ["/api/defects/filter-values", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      
      const response = await fetch(`/api/defects/filter-values?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch filter values");
      }
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  // Fetch selected inspection for modal
  const { data: selectedInspection } = useQuery<InspectionWithDefects>({
    queryKey: ["/api/inspections", selectedInspectionId],
    queryFn: async () => {
      const response = await fetch(`/api/inspections/${selectedInspectionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch inspection");
      }
      return response.json();
    },
    enabled: !!selectedInspectionId,
  });

  // Fetch defects
  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/defects",
      selectedCompany,
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      itemsPerPage,
      filters.dateFrom,
      filters.dateTo,
      filters.assetId,
      filters.driverName,
      filters.zoneName,
      filters.componentName,
      filters.severityLevel,
      filters.status
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
      if (filters.assetId) queryParams.set("assetId", filters.assetId);
      if (filters.driverName) queryParams.set("driverName", filters.driverName);
      if (filters.zoneName) queryParams.set("zoneName", filters.zoneName);
      if (filters.componentName) queryParams.set("componentName", filters.componentName);
      if (filters.severityLevel) queryParams.set("severityLevel", filters.severityLevel);
      if (filters.status) queryParams.set("status", filters.status);

      const response = await fetch(`/api/defects?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch defects");
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

  const handleFilterChange = (field: keyof Filters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [field]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

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

  const getSeverityBadge = (severity: number) => {
    if (severity >= 8) {
      return <Badge variant="destructive" data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
    } else if (severity >= 6) {
      return <Badge className="bg-orange-600 hover:bg-orange-700" data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
    } else if (severity >= 4) {
      return <Badge className="bg-yellow-600 hover:bg-yellow-700" data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
    } else {
      return <Badge variant="secondary" data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: "open" | "pending" | "repaired" | "not-needed") => {
    const variants = {
      open: <Badge variant="destructive" data-testid={`badge-status-${status}`}>Open</Badge>,
      pending: <Badge className="bg-orange-600 hover:bg-orange-700" data-testid={`badge-status-${status}`}>Pending</Badge>,
      repaired: <Badge className="bg-green-600 hover:bg-green-700" data-testid={`badge-status-${status}`}>Repaired</Badge>,
      "not-needed": <Badge variant="secondary" data-testid={`badge-status-${status}`}>Not Needed</Badge>,
    };
    return variants[status];
  };

  const toggleDefectSelection = (defectId: string) => {
    const newSelection = new Set(selectedDefectIds);
    if (newSelection.has(defectId)) {
      newSelection.delete(defectId);
    } else {
      newSelection.add(defectId);
    }
    setSelectedDefectIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedDefectIds.size === defects.length && defects.length > 0) {
      setSelectedDefectIds(new Set());
    } else {
      setSelectedDefectIds(new Set(defects.map(d => d.id)));
    }
  };

  const defects = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Defects & Repairs</h1>
          <p className="text-sm text-muted-foreground">
            View and manage equipment defects and repair status
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search defects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Action Bar - Mark as Repaired */}
        <div className="flex items-center gap-3 p-4 bg-accent/10 border border-accent rounded-lg">
          <span className="text-sm font-medium">
            {selectedDefectIds.size > 0 
              ? `${selectedDefectIds.size} defect${selectedDefectIds.size > 1 ? 's' : ''} selected`
              : 'Select defects to mark as repaired'}
          </span>
          <Button
            onClick={() => setIsRepairDialogOpen(true)}
            className="ml-auto"
            disabled={selectedDefectIds.size === 0}
            data-testid="button-mark-repaired"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Mark as Repaired
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date From:</label>
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="w-40"
              data-testid="filter-date-from"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date To:</label>
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="w-40"
              data-testid="filter-date-to"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Asset:</label>
            <Select
              value={filters.assetId || "all"}
              onValueChange={(value) => handleFilterChange("assetId", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-40" data-testid="filter-asset">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterValues?.assetIds.map((assetId) => (
                  <SelectItem key={assetId} value={assetId}>
                    {assetId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Driver:</label>
            <Select
              value={filters.driverName || "all"}
              onValueChange={(value) => handleFilterChange("driverName", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-40" data-testid="filter-driver">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterValues?.driverNames.map((driverName) => (
                  <SelectItem key={driverName} value={driverName}>
                    {driverName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Zone:</label>
            <Select
              value={filters.zoneName || "all"}
              onValueChange={(value) => handleFilterChange("zoneName", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-40" data-testid="filter-zone">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterValues?.zoneNames.map((zoneName) => (
                  <SelectItem key={zoneName} value={zoneName}>
                    {zoneName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Component:</label>
            <Select
              value={filters.componentName || "all"}
              onValueChange={(value) => handleFilterChange("componentName", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-40" data-testid="filter-component">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterValues?.componentNames.map((componentName) => (
                  <SelectItem key={componentName} value={componentName}>
                    {componentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Severity:</label>
            <Select
              value={filters.severityLevel || "all"}
              onValueChange={(value) => handleFilterChange("severityLevel", value === "all" ? undefined : value as "critical" | "high" | "medium" | "low")}
            >
              <SelectTrigger className="w-32" data-testid="filter-severity">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical (8-10)</SelectItem>
                <SelectItem value="high">High (6-7)</SelectItem>
                <SelectItem value="medium">Medium (4-5)</SelectItem>
                <SelectItem value="low">Low (1-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value === "all" ? undefined : value as "open" | "pending" | "repaired" | "not-needed")}
            >
              <SelectTrigger className="w-32" data-testid="filter-status">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterValues?.statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "not-needed" ? "Not Needed" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="ml-auto"
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : defects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {searchQuery || hasActiveFilters ? "No defects found matching your search" : "No defects yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedDefectIds.size === defects.length && defects.length > 0}
                            onCheckedChange={toggleAll}
                            data-testid="checkbox-select-all"
                          />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Repair
                          </span>
                        </div>
                      </th>
                      <SortableHeader field="datetime">Date & Time</SortableHeader>
                      <SortableHeader field="assetId">Asset ID</SortableHeader>
                      <SortableHeader field="driverName">Driver Name</SortableHeader>
                      <SortableHeader field="zoneName">Zone</SortableHeader>
                      <SortableHeader field="componentName">Component</SortableHeader>
                      <SortableHeader field="defect">Defect</SortableHeader>
                      <SortableHeader field="severity">Severity</SortableHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Driver Notes
                      </th>
                      <SortableHeader field="status">Status</SortableHeader>
                      <SortableHeader field="mechanicName">Mechanic</SortableHeader>
                      <SortableHeader field="repairDate">Repair Date</SortableHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Repair Notes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {defects.map((defect) => {
                      const date = defect.inspection?.datetime ? new Date(defect.inspection.datetime) : null;
                      const formattedDate = date ? date.toLocaleDateString() : "N/A";
                      const formattedTime = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                      return (
                        <tr
                          key={defect.id}
                          className="hover-elevate"
                          data-testid={`row-defect-${defect.id}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedDefectIds.has(defect.id)}
                              onCheckedChange={() => toggleDefectSelection(defect.id)}
                              data-testid={`checkbox-defect-${defect.id}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-datetime-${defect.id}`}>
                            <div>{formattedDate}</div>
                            <div className="text-xs text-muted-foreground">{formattedTime}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium" data-testid={`text-assetId-${defect.id}`}>
                            {defect.assetId}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-driverName-${defect.id}`}>
                            {defect.inspection?.driverName || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-zoneName-${defect.id}`}>
                            {defect.zoneName}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-componentName-${defect.id}`}>
                            {defect.componentName}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-defect-${defect.id}`}>
                            {defect.defect}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getSeverityBadge(defect.severity)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-driverNotes-${defect.id}`}>
                            {defect.driverNotes || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(defect.status)}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-mechanicName-${defect.id}`}>
                            {defect.mechanicName || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm" data-testid={`text-repairDate-${defect.id}`}>
                            {defect.repairDate ? new Date(defect.repairDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-repairNotes-${defect.id}`}>
                            {defect.repairNotes || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInspectionId(defect.inspectionId);
                                setIsModalOpen(true);
                              }}
                              data-testid={`button-view-inspection-${defect.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inspection Detail Modal */}
      <InspectionModal
        inspection={selectedInspection || null}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      {/* Repair Dialog */}
      <RepairDialog
        open={isRepairDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsRepairDialogOpen(open);
          if (!open) {
            setSelectedDefectIds(new Set());
          }
        }}
        defectIds={Array.from(selectedDefectIds)}
        companyId={selectedCompany || ""}
      />
    </div>
  );
}
