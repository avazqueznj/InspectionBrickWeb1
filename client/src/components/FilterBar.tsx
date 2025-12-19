import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";

interface FilterValues {
  inspectionTypes: string[];
  assetIds: string[];
  driverNames: string[];
  driverIds: string[];
}

interface SimpleLocation {
  id: string;
  locationName: string;
}

interface FilterBarProps {
  companyId: string | undefined;
  initialLocationId?: string;
  onFilterChange: (filters: {
    dateFrom?: string;
    dateTo?: string;
    inspectionType?: string;
    assetId?: string;
    driverName?: string;
    driverId?: string;
    locationId?: string;
  }) => void;
}

export function FilterBar({ companyId, initialLocationId, onFilterChange }: FilterBarProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<string>("");
  const [assetId, setAssetId] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>(initialLocationId || "");

  // Fetch available filter values
  const { data: filterValues } = useQuery<FilterValues>({
    queryKey: ["/api/inspections/filter-values", companyId],
    queryFn: async () => {
      if (!companyId) return { inspectionTypes: [], assetIds: [], driverNames: [], driverIds: [] };
      const response = await fetch(`/api/inspections/filter-values?companyId=${companyId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch filter values");
      }
      return response.json();
    },
    enabled: !!companyId,
  });

  // Fetch locations for filter dropdown
  const { data: locations } = useQuery<SimpleLocation[]>({
    queryKey: ["/api/locations/simple", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await fetch(`/api/locations/simple?companyId=${companyId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      return response.json();
    },
    enabled: !!companyId,
  });

  // Reset all company-specific filters when company changes
  useEffect(() => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setInspectionType("");
    setAssetId("");
    setDriverName("");
    setDriverId("");
    // Reset location to initialLocationId (user's location) or empty
    setLocationId(initialLocationId || "");
  }, [companyId, initialLocationId]);

  // Memoize the filters object to prevent unnecessary re-renders
  const filters = useMemo(() => ({
    dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
    dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
    inspectionType: inspectionType || undefined,
    assetId: assetId || undefined,
    driverName: driverName || undefined,
    driverId: driverId || undefined,
    locationId: locationId || undefined,
  }), [dateFrom, dateTo, inspectionType, assetId, driverName, driverId, locationId]);

  // Update parent component when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = dateFrom || dateTo || inspectionType || assetId || driverName || driverId || locationId;

  // Reset all filters
  const handleReset = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setInspectionType("");
    setAssetId("");
    setDriverName("");
    setDriverId("");
    setLocationId("");
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card border rounded-md" data-testid="filter-bar">
      {/* Date From */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="date-from" className="text-xs font-medium">
          Date From
        </Label>
        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-from"
              variant="outline"
              className="justify-start text-left font-normal"
              data-testid="filter-date-from"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                setDateFrom(date);
                setDateFromOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="date-to" className="text-xs font-medium">
          Date To
        </Label>
        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-to"
              variant="outline"
              className="justify-start text-left font-normal"
              data-testid="filter-date-to"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM dd, yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                setDateTo(date);
                setDateToOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Inspection Type */}
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label htmlFor="inspection-type" className="text-xs font-medium">
          Inspection Type
        </Label>
        <Select 
          value={inspectionType || "__clear__"} 
          onValueChange={(val) => setInspectionType(val === "__clear__" ? "" : val)}
        >
          <SelectTrigger id="inspection-type" data-testid="filter-inspection-type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" data-testid="filter-inspection-type-clear">
              All types
            </SelectItem>
            {filterValues?.inspectionTypes.map((type) => (
              <SelectItem key={type} value={type} data-testid={`filter-inspection-type-${type}`}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Asset ID */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="asset-id" className="text-xs font-medium">
          Asset ID
        </Label>
        <Select 
          value={assetId || "__clear__"} 
          onValueChange={(val) => setAssetId(val === "__clear__" ? "" : val)}
        >
          <SelectTrigger id="asset-id" data-testid="filter-asset-id">
            <SelectValue placeholder="All assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" data-testid="filter-asset-id-clear">
              All assets
            </SelectItem>
            {filterValues?.assetIds.map((id) => (
              <SelectItem key={id} value={id} data-testid={`filter-asset-id-${id}`}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver Name */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="driver-name" className="text-xs font-medium">
          Driver Name
        </Label>
        <Select 
          value={driverName || "__clear__"} 
          onValueChange={(val) => setDriverName(val === "__clear__" ? "" : val)}
        >
          <SelectTrigger id="driver-name" data-testid="filter-driver-name">
            <SelectValue placeholder="All drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" data-testid="filter-driver-name-clear">
              All drivers
            </SelectItem>
            {filterValues?.driverNames.map((name) => (
              <SelectItem key={name} value={name} data-testid={`filter-driver-name-${name}`}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver ID */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="driver-id" className="text-xs font-medium">
          Driver ID
        </Label>
        <Select 
          value={driverId || "__clear__"} 
          onValueChange={(val) => setDriverId(val === "__clear__" ? "" : val)}
        >
          <SelectTrigger id="driver-id" data-testid="filter-driver-id">
            <SelectValue placeholder="All IDs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" data-testid="filter-driver-id-clear">
              All IDs
            </SelectItem>
            {filterValues?.driverIds.map((id) => (
              <SelectItem key={id} value={id} data-testid={`filter-driver-id-${id}`}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inspector Location */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="location" className="text-xs font-medium">
          Inspector Location
        </Label>
        <Select 
          value={locationId || "__clear__"} 
          onValueChange={(val) => setLocationId(val === "__clear__" ? "" : val)}
        >
          <SelectTrigger id="location" data-testid="filter-location">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" data-testid="filter-location-clear">
              All locations
            </SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} data-testid={`filter-location-${loc.id}`}>
                {loc.locationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      <div className="flex flex-col gap-1.5 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="min-w-[100px]"
          data-testid="button-reset-filters"
        >
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 ml-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" data-testid="indicator-filters-active" />
          <span className="text-xs text-muted-foreground">Filters active</span>
        </div>
      )}
    </div>
  );
}
