import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { type InspectionWithDefects } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";

interface PrintListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  sortField: string;
  sortDirection: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    inspectionType?: string;
    assetId?: string;
    driverName?: string;
    driverId?: string;
  };
}

interface Company {
  id: string;
  name: string;
  address?: string;
}

export function PrintListModal({ 
  open, 
  onOpenChange, 
  searchQuery, 
  sortField, 
  sortDirection, 
  filters 
}: PrintListModalProps) {
  const { selectedCompany } = useCompany();

  const queryParams = new URLSearchParams({
    companyId: selectedCompany || "",
    search: searchQuery,
    sortField,
    sortDirection,
    page: "1",
    limit: "100",
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
    ...(filters.inspectionType && { inspectionType: filters.inspectionType }),
    ...(filters.assetId && { assetId: filters.assetId }),
    ...(filters.driverName && { driverName: filters.driverName }),
    ...(filters.driverId && { driverId: filters.driverId }),
  });

  const { data: inspectionsData } = useQuery<{ inspections: InspectionWithDefects[]; total: number }>({
    queryKey: ["/api/inspections", selectedCompany, searchQuery, sortField, sortDirection, 1, 100, filters.dateFrom, filters.dateTo, filters.inspectionType, filters.assetId, filters.driverName, filters.driverId],
    queryFn: async () => {
      const response = await fetch(`/api/inspections?${queryParams}`);
      if (!response.ok) throw new Error("Failed to fetch inspections");
      return response.json();
    },
    enabled: !!selectedCompany && open,
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: open,
  });

  const company = companies?.find(c => c.id === selectedCompany);
  const inspections = inspectionsData?.inspections || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
        <div className="print:hidden flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Inspection List Report - Use Ctrl+P / Cmd+P to Print</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-print-list"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="print-content bg-white text-black p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">EQUIPMENT INSPECTION LIST</h1>
            <p className="text-sm text-gray-600">Official Inspection Records Report</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold">{company?.name || selectedCompany}</h2>
            {company?.address && (
              <p className="text-sm text-gray-600">{company.address}</p>
            )}
          </div>

          <div className="mb-4">
            <p className="text-sm">
              <span className="font-semibold">Total Inspections:</span> {inspections.length}
              {inspections.length === 100 && " (Limited to 100 records)"}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Report Generated:</span> {new Date().toLocaleString('en-US')}
            </p>
            {searchQuery && (
              <p className="text-sm">
                <span className="font-semibold">Search Filter:</span> {searchQuery}
              </p>
            )}
          </div>

          <hr className="border-gray-300 mb-6" />

          {inspections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No inspections found matching the current filters.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {inspections.map((inspection, index) => {
                const defectsCount = inspection.defects?.length || 0;
                const hasDefects = defectsCount > 0;

                return (
                  <div key={inspection.id} className="border-2 border-gray-300 rounded p-6 page-break-inside-avoid">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">Inspection #{index + 1}</h3>
                      <span className="font-mono text-sm">{inspection.id.substring(0, 8)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold">Date & Time:</span>{" "}
                          {new Date(inspection.datetime).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">Type:</span> {inspection.inspectionType}
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">Asset ID:</span>{" "}
                          <span className="font-mono">{inspection.assetId}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold">Driver:</span> {inspection.driverName}
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">Driver ID:</span>{" "}
                          <span className="font-mono">{inspection.driverId}</span>
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">Defects Found:</span>{" "}
                          <span className={hasDefects ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                            {defectsCount}
                          </span>
                        </p>
                      </div>
                    </div>

                    {hasDefects && (
                      <>
                        <hr className="border-gray-200 my-3" />
                        <div>
                          <h4 className="text-sm font-bold mb-2">DEFECTS:</h4>
                          <div className="space-y-2">
                            {inspection.defects.map((defect) => {
                              const severityColor = 
                                defect.severity >= 70 ? 'border-red-600 bg-red-50' :
                                defect.severity >= 40 ? 'border-orange-500 bg-orange-50' :
                                'border-gray-400 bg-gray-50';
                              
                              const statusColor =
                                defect.status === 'open' ? 'bg-red-600' :
                                defect.status === 'pending' ? 'bg-orange-500' :
                                'bg-green-600';

                              return (
                                <div
                                  key={defect.id}
                                  className={`border rounded p-3 ${severityColor}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs">
                                      <span className="font-semibold">{defect.zoneName}</span> - {defect.componentName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${statusColor}`}>
                                        {defect.status.toUpperCase()}
                                      </span>
                                      <span className="text-xs font-semibold">Severity: {defect.severity}</span>
                                    </div>
                                  </div>
                                  <p className="text-xs">{defect.defect}</p>
                                  {defect.driverNotes && (
                                    <p className="text-xs mt-1 italic">Note: {defect.driverNotes}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <hr className="border-gray-300 mt-8 mb-4" />

          <div className="text-center text-xs text-gray-600">
            <p>This is an official inspection list. All defects must be addressed according to DOT regulations.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
