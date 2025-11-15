import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, DatabaseBackup } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Redirect non-superusers via useEffect (not during render)
  useEffect(() => {
    if (!isLoading && !user?.isSuperuser) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Show loading state while auth is resolving
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Return null while redirecting
  if (!user?.isSuperuser) {
    return null;
  }

  const reseedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reseed");
      return await res.json();
    },
    onSuccess: (data: { timestamp: string }) => {
      toast({
        title: "Database Reseeded",
        description: `Successfully reseeded database at ${new Date(data.timestamp).toLocaleString()}`,
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Reseed Failed",
        description: error.message || "Failed to reseed database",
      });
    },
  });

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          System administration and maintenance tools
        </p>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible operations that affect the entire database
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <DatabaseBackup className="h-5 w-5 text-destructive" />
                  <h3 className="font-semibold text-destructive">
                    Reseed Database
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clears all data and repopulates the database with fresh seed data.
                  This will delete ALL existing inspections, defects, users, assets,
                  and companies. Only use this in development.
                </p>
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This operation cannot be undone. All current data will be lost.
                </p>
              </div>
              <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    disabled={reseedMutation.isPending}
                    data-testid="button-reseed-database"
                  >
                    {reseedMutation.isPending ? "Reseeding..." : "Reseed Database"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action will permanently delete all data in the database
                        and replace it with fresh seed data.
                      </p>
                      <p className="font-semibold text-destructive">
                        This includes:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All inspections and defects</li>
                        <li>All users (except those recreated by seed)</li>
                        <li>All assets and companies</li>
                        <li>All inspection types and layouts</li>
                      </ul>
                      <p className="font-semibold">
                        This operation cannot be undone!
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-reseed">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        reseedMutation.mutate();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-reseed"
                    >
                      Yes, Reseed Database
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Admin Tools */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            View system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional admin tools will be added here as needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
