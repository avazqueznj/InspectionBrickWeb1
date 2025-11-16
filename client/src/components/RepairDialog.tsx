import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import { type User } from "@shared/schema";

interface RepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defectIds: string[];
  companyId: string;
}

export function RepairDialog({ open, onOpenChange, defectIds, companyId }: RepairDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [mechanicName, setMechanicName] = useState("");
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<"repaired" | "not-needed" | "open">("repaired");
  const [repairNotes, setRepairNotes] = useState("");

  // Use companyId from props or fall back to currentUser's companyId
  const effectiveCompanyId = companyId || currentUser?.companyId || "";

  // Fetch users with web access for mechanic dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users", effectiveCompanyId, "webAccess"],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("companyId", effectiveCompanyId);
      queryParams.set("limit", "1000");
      
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/users?${queryParams.toString()}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      // Filter to only users with web access
      return data.data.filter((u: User) => u.webAccess);
    },
    enabled: !!effectiveCompanyId && open,
  });

  // Default to current user's ID when dialog opens
  useEffect(() => {
    if (open && currentUser?.userId && (!mechanicName || mechanicName === "")) {
      setMechanicName(currentUser.userId);
    }
  }, [open, currentUser?.userId]);

  const repairMutation = useMutation({
    mutationFn: async (data: {
      defectIds: string[];
      mechanicName: string;
      repairDate: string;
      status: "repaired" | "not-needed" | "open";
      repairNotes?: string;
    }) => {
      const response = await apiRequest("PATCH", "/api/defects/batch/repair", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/defects"] });
      const statusText = status === "repaired" ? "repaired" : status === "not-needed" ? "not needed" : "open (reverted)";
      toast({
        title: "Success",
        description: `${defectIds.length} defect${defectIds.length > 1 ? 's' : ''} marked as ${statusText}`,
      });
      onOpenChange(false);
      // Reset form
      setRepairNotes("");
      setRepairDate(new Date().toISOString().split('T')[0]);
      setStatus("repaired");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update defects",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mechanicName) {
      toast({
        title: "Error",
        description: "Please select a mechanic",
        variant: "destructive",
      });
      return;
    }

    // Normalize date to UTC midnight to avoid timezone issues
    const normalizedDate = new Date(repairDate + 'T00:00:00Z');
    
    if (isNaN(normalizedDate.getTime())) {
      toast({
        title: "Error",
        description: "Invalid repair date",
        variant: "destructive",
      });
      return;
    }

    repairMutation.mutate({
      defectIds,
      mechanicName,
      repairDate: normalizedDate.toISOString(),
      status,
      repairNotes: repairNotes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-repair">
        <DialogHeader>
          <DialogTitle>Repair Report</DialogTitle>
          <DialogDescription>
            Mark {defectIds.length} defect{defectIds.length > 1 ? 's' : ''} with repair information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mechanic">Mechanic</Label>
            <Select value={mechanicName} onValueChange={setMechanicName}>
              <SelectTrigger id="mechanic" data-testid="select-mechanic">
                <SelectValue placeholder="Select mechanic" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.userId}>
                    {user.userFullName} ({user.userId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repairDate">Repair Date</Label>
            <Input
              id="repairDate"
              type="date"
              value={repairDate}
              onChange={(e) => setRepairDate(e.target.value)}
              data-testid="input-repair-date"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as "repaired" | "not-needed" | "open")}>
              <SelectTrigger id="status" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="repaired">Repaired</SelectItem>
                <SelectItem value="not-needed">Repair Not Needed</SelectItem>
                <SelectItem value="open">Open (Revert Repair)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repairNotes">Repair Notes (Optional)</Label>
            <Textarea
              id="repairNotes"
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="Add any additional notes about the repair..."
              rows={3}
              data-testid="textarea-repair-notes"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={repairMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={repairMutation.isPending}
              data-testid="button-submit-repair"
            >
              {repairMutation.isPending ? "Saving..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
