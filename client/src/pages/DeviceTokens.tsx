import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Key } from "lucide-react";
import type { Company } from "@shared/schema";

export default function DeviceTokens() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const handleGenerateToken = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Company required",
        description: "Please select a company first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/auth/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId: selectedCompanyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate token");
      }

      const data = await response.json();
      setGeneratedToken(data.token);
      toast({
        title: "Token generated",
        description: `Device token created for ${companies.find(c => c.id === selectedCompanyId)?.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate device token",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast({
        title: "Copied",
        description: "Device token copied to clipboard",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Key className="h-8 w-8" />
          Device Tokens
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate perpetual device tokens for STM32 inspection devices. These tokens are valid for 10 years and are company-scoped.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Device Token</CardTitle>
          <CardDescription>
            Device tokens are JWT tokens that don't need to be stored in the database. 
            They're verified using the public key and remain valid as long as they can be decoded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company-select">Company</Label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger id="company-select" data-testid="select-company">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} {company.dotNumber ? `(DOT: ${company.dotNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerateToken}
            disabled={!selectedCompanyId || isGenerating}
            data-testid="button-generate-token"
          >
            {isGenerating ? "Generating..." : "Generate Token"}
          </Button>

          {generatedToken && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="token-output">Generated Token (10 year expiration)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyToken}
                  data-testid="button-copy-token"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Textarea
                id="token-output"
                value={generatedToken}
                readOnly
                className="font-mono text-xs"
                rows={8}
                data-testid="textarea-token"
              />
              <p className="text-sm text-muted-foreground">
                ⚠️ Save this token securely. It cannot be retrieved later. Configure your STM32 device to send this token in the Authorization header as "Bearer {`{token}`}".
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-medium mb-2">Device Configuration</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Generate a device token for the company using this page</li>
              <li>Copy the token and configure it on your STM32 device</li>
              <li>Device sends BRICKINSPECTION data to: <code className="bg-muted px-1 rounded">POST /api/device/inspections</code></li>
              <li>Include token in header: <code className="bg-muted px-1 rounded">Authorization: Bearer {`{token}`}</code></li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium mb-2">Security Notes</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Tokens are valid for 10 years (perpetual for devices)</li>
              <li>Tokens are company-scoped - devices can only upload for their assigned company</li>
              <li>Tokens are NOT stored in the database - they're verified via signature only</li>
              <li>Tokens cannot be revoked (regenerate and reconfigure device if compromised)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
