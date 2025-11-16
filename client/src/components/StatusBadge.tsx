import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "open" | "pending" | "repaired" | "not-needed";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    open: {
      className: "bg-destructive/10 text-destructive border-destructive/20",
      label: "Open"
    },
    pending: {
      className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      label: "Pending"
    },
    repaired: {
      className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      label: "Repaired"
    },
    "not-needed": {
      className: "bg-muted text-muted-foreground border-muted-foreground/20",
      label: "Not Needed"
    }
  };

  const variant = variants[status];

  return (
    <Badge 
      variant="outline" 
      className={`${variant.className} font-medium`}
      data-testid={`status-${status}`}
    >
      {variant.label}
    </Badge>
  );
}
