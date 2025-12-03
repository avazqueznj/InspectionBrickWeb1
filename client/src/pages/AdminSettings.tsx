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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFooter } from "@/components/PageFooter";
import { AlertTriangle, DatabaseBackup, FileText, Image, Upload, Copy, Check } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Company = {
  id: string;
  name: string;
  dotNumber: string;
};

export default function AdminSettings() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [deviceToken, setDeviceToken] = useState<string>("");
  const [imageUuid, setImageUuid] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [imageDeviceToken, setImageDeviceToken] = useState<string>("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadedUuid, setUploadedUuid] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

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

  // Fetch all companies
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

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

  const uploadImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await apiRequest("POST", "/api/admin/zone-images", { imageData });
      return await res.json();
    },
    onSuccess: (data: { uuid: string; size: number }) => {
      setUploadedUuid(data.uuid);
      toast({
        title: "Image Uploaded",
        description: `Zone image created with UUID: ${data.uuid.substring(0, 8)}...`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select a JPEG image file",
      });
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadImageMutation.mutate(base64);
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Read Error",
        description: "Failed to read the image file",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCopyUuid = () => {
    if (uploadedUuid) {
      navigator.clipboard.writeText(uploadedUuid);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    }
  };

  const handlePreviewConfig = async () => {
    if (!selectedCompany || !deviceToken.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a company and provide a device token",
      });
      return;
    }

    try {
      const response = await fetch(`/api/device/config?company=${selectedCompany}`, {
        headers: {
          'Authorization': `Bearer ${deviceToken.trim()}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const ediContent = await response.text();
      
      // Open in new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Device Config - ${selectedCompany}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  white-space: pre-wrap;
                  padding: 20px;
                  background: #1e1e1e;
                  color: #d4d4d4;
                }
              </style>
            </head>
            <body>${ediContent}</body>
          </html>
        `);
        newWindow.document.close();
      }

      setIsConfigDialogOpen(false);
      setDeviceToken("");
      
      toast({
        title: "Config Retrieved",
        description: "Device configuration opened in new tab",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to fetch device config",
      });
    }
  };

  const handlePreviewImage = async () => {
    if (!imageUuid.trim() || !imageDeviceToken.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide an image UUID and device token",
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(imageUuid.trim())) {
      toast({
        variant: "destructive",
        title: "Invalid UUID",
        description: "Please provide a valid UUID format",
      });
      return;
    }

    try {
      const response = await fetch(`/api/device/images/${imageUuid.trim()}`, {
        headers: {
          'Authorization': `Bearer ${imageDeviceToken.trim()}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Get the blob and create an object URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Zone Image - ${imageUuid}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  background: #1e1e1e;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  border: 1px solid #333;
                }
                .info {
                  color: #d4d4d4;
                  font-family: 'Courier New', monospace;
                  margin-bottom: 10px;
                }
              </style>
            </head>
            <body>
              <div class="info">UUID: ${imageUuid}</div>
              <img src="${imageUrl}" alt="Zone Image" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }

      setIsImageDialogOpen(false);
      setImageDeviceToken("");
      
      toast({
        title: "Image Retrieved",
        description: "Zone image opened in new tab",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to fetch zone image",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          System administration and maintenance tools
        </p>
      </div>

      {/* Device Config Preview */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Device Config Preview</CardTitle>
              <CardDescription>
                Test device configuration endpoint with real device tokens
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold">Preview Device Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a device token from an actual device to preview the BRICKCONFIG
                  EDI format that would be downloaded. Useful for debugging device data issues.
                </p>
              </div>
              <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    data-testid="button-preview-config"
                  >
                    Preview Config
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Preview Device Configuration</DialogTitle>
                    <DialogDescription>
                      Select a company and paste the device token to view the configuration
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-select">Company</Label>
                      <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger id="company-select" data-testid="select-company">
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name} ({company.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device-token">Device Token</Label>
                      <Input
                        id="device-token"
                        type="text"
                        placeholder="Paste device token here..."
                        value={deviceToken}
                        onChange={(e) => setDeviceToken(e.target.value)}
                        data-testid="input-device-token"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the JWT token from your device
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsConfigDialogOpen(false)}
                      data-testid="button-cancel-preview"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePreviewConfig}
                      data-testid="button-submit-preview"
                    >
                      Preview in New Tab
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Image Preview */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Image className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Zone Image Preview</CardTitle>
              <CardDescription>
                Test zone image download endpoint with device tokens
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold">Preview Zone Image</h3>
                <p className="text-sm text-muted-foreground">
                  Enter an image UUID and device token to preview the zone image
                  that would be downloaded by devices. Test UUID: 11111111-1111-1111-1111-111111111111
                </p>
              </div>
              <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    data-testid="button-preview-image"
                  >
                    Preview Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Preview Zone Image</DialogTitle>
                    <DialogDescription>
                      Enter the image UUID and device token to view the zone image
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="image-uuid">Image UUID</Label>
                      <Input
                        id="image-uuid"
                        type="text"
                        placeholder="11111111-1111-1111-1111-111111111111"
                        value={imageUuid}
                        onChange={(e) => setImageUuid(e.target.value)}
                        data-testid="input-image-uuid"
                      />
                      <p className="text-xs text-muted-foreground">
                        UUID of the zone image to retrieve
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image-device-token">Device Token</Label>
                      <Input
                        id="image-device-token"
                        type="text"
                        placeholder="Paste device token here..."
                        value={imageDeviceToken}
                        onChange={(e) => setImageDeviceToken(e.target.value)}
                        data-testid="input-image-device-token"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the JWT token from your device
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsImageDialogOpen(false)}
                      data-testid="button-cancel-image-preview"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePreviewImage}
                      data-testid="button-submit-image-preview"
                    >
                      Preview in New Tab
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Image Upload */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Zone Image Upload</CardTitle>
              <CardDescription>
                Upload JPEG images for zone documentation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold">Upload New Zone Image</h3>
                <p className="text-sm text-muted-foreground">
                  Select a JPEG image file to upload. A random UUID will be generated
                  automatically. You can then use this UUID in layouts.
                </p>
              </div>
              <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
                setIsUploadDialogOpen(open);
                if (!open) {
                  setUploadedUuid(null);
                  setCopiedUuid(false);
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    data-testid="button-upload-image"
                  >
                    Upload Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Zone Image</DialogTitle>
                    <DialogDescription>
                      Select a JPEG image to upload. A UUID will be generated automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {!uploadedUuid ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 border-muted-foreground/25"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="mb-1 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                JPEG images only
                              </p>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/jpg"
                              onChange={handleFileSelect}
                              disabled={uploadImageMutation.isPending}
                              data-testid="input-image-file"
                            />
                          </label>
                        </div>
                        {uploadImageMutation.isPending && (
                          <p className="text-center text-sm text-muted-foreground">
                            Uploading...
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                          <Check className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-green-500 font-medium">
                            Image uploaded successfully!
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label>Generated UUID</Label>
                          <div className="flex gap-2">
                            <Input
                              value={uploadedUuid}
                              readOnly
                              className="font-mono text-sm"
                              data-testid="text-uploaded-uuid"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={handleCopyUuid}
                              data-testid="button-copy-uuid"
                            >
                              {copiedUuid ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use this UUID in your layout configuration
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadDialogOpen(false)}
                      data-testid="button-close-upload"
                    >
                      {uploadedUuid ? "Close" : "Cancel"}
                    </Button>
                    {uploadedUuid && (
                      <Button
                        onClick={() => {
                          setUploadedUuid(null);
                        }}
                        data-testid="button-upload-another"
                      >
                        Upload Another
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

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
      
      <PageFooter />
    </div>
  );
}
