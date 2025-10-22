import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { type InspectionWithDefects } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";

interface PrintReportModalProps {
  inspectionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Company {
  id: string;
  name: string;
  address?: string;
}

export function PrintReportModal({ inspectionId, open, onOpenChange }: PrintReportModalProps) {
  const { data: inspection } = useQuery<InspectionWithDefects>({
    queryKey: ["/api/inspections", inspectionId],
    queryFn: async () => {
      const response = await fetch(`/api/inspections/${inspectionId}`);
      if (!response.ok) throw new Error("Failed to fetch inspection");
      return response.json();
    },
    enabled: !!inspectionId && open,
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: open,
  });

  const company = companies?.find(c => c.id === inspection?.companyId);

  const handlePrint = () => {
    window.print();
  };

  if (!inspection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
        <div className="print:hidden flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Inspection Report</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-print"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="print-content bg-white text-black p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">EQUIPMENT INSPECTION REPORT</h1>
            <p className="text-sm text-gray-600">Official DOT Inspection Document</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold">{company?.name || inspection.companyId}</h2>
            {company?.address && (
              <p className="text-sm text-gray-600">{company.address}</p>
            )}
          </div>

          <hr className="border-gray-300 mb-6" />

          <div className="mb-6">
            <h3 className="text-base font-bold mb-3">INSPECTION DETAILS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm">
                  <span className="font-semibold">Inspection ID:</span>{" "}
                  <span className="font-mono">{inspection.id.substring(0, 8)}</span>
                </p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">Date & Time:</span>{" "}
                  {new Date(inspection.datetime).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">Inspection Type:</span>{" "}
                  {inspection.inspectionType}
                </p>
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-semibold">Asset ID:</span>{" "}
                  <span className="font-mono">{inspection.assetId}</span>
                </p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">Driver Name:</span>{" "}
                  {inspection.driverName}
                </p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">Driver ID:</span>{" "}
                  <span className="font-mono">{inspection.driverId}</span>
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-300 mb-6" />

          <div className="mb-6">
            <h3 className="text-base font-bold mb-3">DEFECTS IDENTIFIED</h3>
            
            {!inspection.defects || inspection.defects.length === 0 ? (
              <div className="text-center py-8 bg-green-50 border-2 border-green-500 rounded">
                <p className="text-lg font-semibold text-green-700">
                  ✓ NO DEFECTS FOUND - INSPECTION PASSED
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm mb-4">Total Defects Found: {inspection.defects.length}</p>
                <div className="space-y-4">
                  {inspection.defects.map((defect, index) => {
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
                        className={`border-2 rounded p-4 ${severityColor}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold">Defect #{index + 1}</h4>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${statusColor}`}>
                              {defect.status.toUpperCase()}
                            </span>
                            <span className="font-semibold">Severity: {defect.severity}/100</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <p>
                            <span className="font-semibold">Zone:</span> {defect.zoneName}
                          </p>
                          <p>
                            <span className="font-semibold">Component:</span> {defect.componentName}
                          </p>
                        </div>
                        
                        <p className="text-sm mb-2">
                          <span className="font-semibold">Defect:</span> {defect.defect}
                        </p>
                        
                        {defect.driverNotes && (
                          <p className="text-sm mb-1">
                            <span className="font-semibold">Driver Notes:</span> {defect.driverNotes}
                          </p>
                        )}
                        
                        {defect.repairNotes && (
                          <p className="text-sm">
                            <span className="font-semibold">Repair Notes:</span> {defect.repairNotes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <hr className="border-gray-300 mt-8 mb-4" />

          <div className="text-center text-xs text-gray-600">
            <p>This is an official inspection report. All defects must be addressed according to DOT regulations.</p>
            <p className="mt-1">Report Generated: {new Date().toLocaleString('en-US')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
