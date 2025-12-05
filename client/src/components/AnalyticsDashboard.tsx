import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChevronDown, ChevronUp, RefreshCw, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface InspectionAnalytics {
  assetsMostDefects: { assetId: string; defectCount: number }[];
  usersByInspectionCount: { userId: string; inspectionCount: number }[];
  componentsMostDefects: { componentName: string; defectCount: number }[];
  defectsBySeverity: { severity: string; count: number }[];
  totalInspections: number;
  totalDefects: number;
}

interface DefectAnalytics {
  assetsMostDefects: { assetId: string; defectCount: number }[];
  componentsMostDefects: { componentName: string; defectCount: number }[];
  defectsByStatus: { status: string; count: number }[];
  defectsBySeverity: { severity: string; count: number }[];
  zonesMostDefects: { zoneName: string; defectCount: number }[];
  totalOpen: number;
  totalRepaired: number;
}

interface AnalyticsDashboardProps {
  companyId: string | null;
  type: "inspections" | "defects";
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(0, 84%, 60%)",
  high: "hsl(25, 95%, 53%)",
  medium: "hsl(45, 93%, 47%)",
  low: "hsl(142, 71%, 45%)",
};

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(0, 84%, 60%)",
  pending: "hsl(45, 93%, 47%)",
  repaired: "hsl(142, 71%, 45%)",
  "not-needed": "hsl(217, 91%, 60%)",
};

const chartConfig = {
  defectCount: {
    label: "Defects",
    color: "hsl(var(--primary))",
  },
  inspectionCount: {
    label: "Inspections",
    color: "hsl(var(--primary))",
  },
  count: {
    label: "Count",
    color: "hsl(var(--primary))",
  },
};

export function AnalyticsDashboard({ companyId, type }: AnalyticsDashboardProps) {
  const storageKey = `analytics-${type}-open`;
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  const endpoint = type === "inspections" ? "/api/inspections/analytics" : "/api/defects/analytics";
  
  const { data, isLoading, refetch, isFetching } = useQuery<InspectionAnalytics | DefectAnalytics>({
    queryKey: [endpoint, companyId],
    queryFn: async () => {
      const response = await fetch(`${endpoint}?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!companyId && isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (!companyId) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-4 py-3 hover-elevate"
            data-testid="button-analytics-toggle"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Analytics Dashboard</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
                data-testid="button-refresh-analytics"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : type === "inspections" ? (
              <InspectionAnalyticsView data={data as InspectionAnalytics} />
            ) : (
              <DefectAnalyticsView data={data as DefectAnalytics} />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function InspectionAnalyticsView({ data }: { data: InspectionAnalytics | undefined }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-total-inspections">{data.totalInspections}</div>
            <div className="text-xs text-muted-foreground">Total Inspections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive" data-testid="text-total-defects">{data.totalDefects}</div>
            <div className="text-xs text-muted-foreground">Total Defects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-unique-assets">{data.assetsMostDefects.length}</div>
            <div className="text-xs text-muted-foreground">Assets with Defects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-unique-inspectors">{data.usersByInspectionCount.length}</div>
            <div className="text-xs text-muted-foreground">Active Inspectors</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Assets by Defects</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsMostDefects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={data.assetsMostDefects.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="assetId" 
                    width={80}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + "..." : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="defectCount" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Defects by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.defectsBySeverity.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
                  <PieChart>
                    <Pie
                      data={data.defectsBySeverity}
                      dataKey="count"
                      nameKey="severity"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {data.defectsBySeverity.map((entry) => (
                        <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {data.defectsBySeverity.map((item) => (
                    <div key={item.severity} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: SEVERITY_COLORS[item.severity] || "hsl(var(--muted))" }}
                      />
                      <span className="capitalize">{item.severity}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Inspectors</CardTitle>
          </CardHeader>
          <CardContent>
            {data.usersByInspectionCount.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No inspections recorded</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={data.usersByInspectionCount.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="userId" 
                    width={80}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + "..." : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="inspectionCount" fill="hsl(var(--accent))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Components with Defects</CardTitle>
          </CardHeader>
          <CardContent>
            {data.componentsMostDefects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={data.componentsMostDefects.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="componentName" 
                    width={100}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="defectCount" fill="hsl(var(--destructive))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DefectAnalyticsView({ data }: { data: DefectAnalytics | undefined }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive" data-testid="text-total-open">{data.totalOpen}</div>
            <div className="text-xs text-muted-foreground">Open Defects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500" data-testid="text-total-repaired">{data.totalRepaired}</div>
            <div className="text-xs text-muted-foreground">Repaired</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-affected-assets">{data.assetsMostDefects.length}</div>
            <div className="text-xs text-muted-foreground">Affected Assets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-affected-zones">{data.zonesMostDefects.length}</div>
            <div className="text-xs text-muted-foreground">Affected Zones</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Defects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.defectsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
                  <PieChart>
                    <Pie
                      data={data.defectsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {data.defectsByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {data.defectsByStatus.map((item) => (
                    <div key={item.status} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: STATUS_COLORS[item.status] || "hsl(var(--muted))" }}
                      />
                      <span className="capitalize">{item.status}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Defects by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.defectsBySeverity.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
                  <PieChart>
                    <Pie
                      data={data.defectsBySeverity}
                      dataKey="count"
                      nameKey="severity"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {data.defectsBySeverity.map((entry) => (
                        <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {data.defectsBySeverity.map((item) => (
                    <div key={item.severity} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: SEVERITY_COLORS[item.severity] || "hsl(var(--muted))" }}
                      />
                      <span className="capitalize">{item.severity}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Assets by Defects</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsMostDefects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={data.assetsMostDefects.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="assetId" 
                    width={80}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + "..." : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="defectCount" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Zones by Defects</CardTitle>
          </CardHeader>
          <CardContent>
            {data.zonesMostDefects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No defects recorded</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={data.zonesMostDefects.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="zoneName" 
                    width={100}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="defectCount" fill="hsl(var(--destructive))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
