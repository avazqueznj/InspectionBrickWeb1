import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type UserWithoutPassword, type InsertUser, type Company, type Location } from "@shared/schema";
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
import { UserModal } from "@/components/UserModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = "userId" | "userFullName" | "status";
type SortDirection = "asc" | "desc";

interface PaginatedResponse {
  data: UserWithoutPassword[];
  total: number;
  page: number;
  totalPages: number;
}

interface UserFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export default function Users() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("userId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  const itemsPerPage = 10;

  // Reset to page 1 when search query, status filter, location filter, or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompany, statusFilter, locationFilter]);

  // Fetch filter values
  const { data: filterValues } = useQuery<UserFilterValues>({
    queryKey: ["/api/users/filter-values", selectedCompany],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompany) queryParams.set("companyId", selectedCompany);
      
      const response = await fetch(`/api/users/filter-values?${queryParams.toString()}`);
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

  // Fetch locations for the current company
  const { data: locations = [] } = useQuery<Location[]>({
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

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: async () => {
      // Invalidate all queries that start with /api/users
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/users"],
        exact: false 
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest("PATCH", `/api/users/${data.userId}`, data);
    },
    onSuccess: async () => {
      // Invalidate all queries that start with /api/users
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/users"],
        exact: false 
      });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/users",
      selectedCompany,
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      itemsPerPage,
      statusFilter,
      locationFilter,
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
      
      // Add location filter (skip if "ALL")
      if (locationFilter && locationFilter !== "ALL") {
        queryParams.set("location", locationFilter);
      }
      
      const response = await fetch(`/api/users?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleModalSubmit = (data: InsertUser) => {
    if (selectedUser) {
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

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and access permissions
          </p>
        </div>

        {/* Search Bar and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Location:</span>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-location-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.locationName} value={location.locationName}>
                    {location.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <Button onClick={handleCreateUser} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {users.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, total)} of {total} users
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableHeader field="userId">User ID</SortableHeader>
                  <SortableHeader field="userFullName">Full Name</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    User Tag
                  </th>
                  <SortableHeader field="status">Status</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Web Access
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
                      <td className="px-4 py-4" colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground">
                        <p className="text-sm">No users found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr 
                      key={user.userId} 
                      className="hover-elevate"
                      data-testid={`row-user-${user.userId}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm" data-testid={`text-userId-${user.userId}`}>
                          {user.userId}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium" data-testid={`text-userFullName-${user.userId}`}>
                          {user.userFullName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-muted-foreground" data-testid={`text-userTag-${user.userId}`}>
                          {user.userTag || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={user.status === "ACTIVE" ? "default" : "secondary"}
                          data-testid={`badge-status-${user.userId}`}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={user.webAccess ? "default" : "secondary"}
                          data-testid={`badge-webAccess-${user.userId}`}
                        >
                          {user.webAccess ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          data-testid={`button-edit-${user.userId}`}
                          title="Edit User"
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

      {/* User Create/Edit Modal */}
      <UserModal
        user={selectedUser}
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
