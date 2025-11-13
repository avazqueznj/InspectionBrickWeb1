interface SeverityIndicatorProps {
  severity: number;
}

export function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const getSeverityColor = (value: number) => {
    if (value >= 8) return 'bg-destructive';
    if (value >= 6) return 'bg-orange-600';
    if (value >= 4) return 'bg-yellow-600';
    return 'bg-chart-2';
  };

  const getSeverityText = (value: number) => {
    if (value >= 8) return 'Critical';
    if (value >= 6) return 'High';
    if (value >= 4) return 'Medium';
    return 'Low';
  };

  const getSeverityTextColor = (value: number) => {
    if (value >= 8) return 'text-destructive';
    if (value >= 6) return 'text-orange-600';
    if (value >= 4) return 'text-yellow-600';
    return 'text-chart-2';
  };

  return (
    <div className="flex items-center gap-2" data-testid="severity-indicator">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
        <div
          className={`h-full ${getSeverityColor(severity)} transition-all`}
          style={{ width: `${(severity / 10) * 100}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${getSeverityTextColor(severity)} min-w-16`}>
        {severity} - {getSeverityText(severity)}
      </span>
    </div>
  );
}
