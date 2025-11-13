import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type InspectionWithDefects } from "@shared/schema";
import { StatusBadge } from "./StatusBadge";
import { SeverityIndicator } from "./SeverityIndicator";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InspectionModalProps {
  inspection: InspectionWithDefects | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectionModal({ inspection, open, onOpenChange }: InspectionModalProps) {
  if (!inspection) return null;

  // Filter out severity 0 defects
  const significantDefects = inspection.defects?.filter(d => d.severity > 0) || [];

  // Parse inspection form data
  let formDataEntries: Array<[string, string]> = [];
  if (inspection.inspectionFormData) {
    try {
      const parsed = JSON.parse(inspection.inspectionFormData);
      formDataEntries = Object.entries(parsed);
    } catch (e) {
      // If parsing fails, keep empty array
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-inspection-details">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">Inspection Details</DialogTitle>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                ID: {inspection.id}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Inspection Metadata */}
          <div>
            <h3 className="text-lg font-medium mb-4">Inspection Information</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Date & Time
                </p>
                <p className="text-sm font-medium" data-testid="text-datetime">
                  {new Date(inspection.datetime).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Inspection Type
                </p>
                <p className="text-sm font-medium" data-testid="text-inspection-type">
                  {inspection.inspectionType}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Asset{inspection.assets && inspection.assets.length > 1 ? 's' : ''} ({inspection.assets?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1" data-testid="text-asset-ids">
                  {inspection.assets && inspection.assets.length > 0 ? (
                    inspection.assets.map((assetId, index) => (
                      <span key={index} className="text-xs font-medium font-mono bg-accent px-2 py-0.5 rounded">
                        {assetId}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-medium font-mono text-muted-foreground">No assets</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Driver Name
                </p>
                <p className="text-sm font-medium" data-testid="text-driver-name">
                  {inspection.driverName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Driver ID
                </p>
                <p className="text-sm font-medium font-mono" data-testid="text-driver-id">
                  {inspection.driverId}
                </p>
              </div>
            </div>
          </div>

          {/* Inspection Form Data */}
          {formDataEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Inspection Form Data</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formDataEntries.map(([key, value], index) => (
                        <tr key={index} className="hover-elevate">
                          <td className="px-4 py-3 text-sm font-medium">{key}</td>
                          <td className="px-4 py-3 text-sm">{value || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Defects Section */}
          <div>
            <h3 className="text-lg font-medium mb-4">
              Defects ({significantDefects.length})
            </h3>
            {significantDefects.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Asset ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Zone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Component
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Defect
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Severity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {significantDefects.map((defect) => (
                        <tr key={defect.id} className="hover-elevate" data-testid={`row-defect-${defect.id}`}>
                          <td className="px-4 py-3 text-sm font-mono font-medium">{defect.assetId}</td>
                          <td className="px-4 py-3 text-sm">{defect.zoneName}</td>
                          <td className="px-4 py-3 text-sm">{defect.componentName}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">{defect.defect}</p>
                              {defect.driverNotes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Note: {defect.driverNotes}
                                </p>
                              )}
                              {defect.repairNotes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Repair: {defect.repairNotes}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <SeverityIndicator severity={defect.severity} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={defect.status as "open" | "pending" | "repaired"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">No defects reported for this inspection</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
