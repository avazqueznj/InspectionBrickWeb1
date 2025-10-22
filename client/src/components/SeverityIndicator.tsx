interface SeverityIndicatorProps {
  severity: number;
}

export function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const getSeverityColor = (value: number) => {
    if (value <= 33) return 'bg-chart-2';
    if (value <= 66) return 'bg-chart-3';
    return 'bg-destructive';
  };

  const getSeverityText = (value: number) => {
    if (value <= 33) return 'Low';
    if (value <= 66) return 'Medium';
    return 'High';
  };

  const getSeverityTextColor = (value: number) => {
    if (value <= 33) return 'text-chart-2';
    if (value <= 66) return 'text-chart-3';
    return 'text-destructive';
  };

  return (
    <div className="flex items-center gap-2" data-testid="severity-indicator">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
        <div
          className={`h-full ${getSeverityColor(severity)} transition-all`}
          style={{ width: `${severity}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${getSeverityTextColor(severity)} min-w-16`}>
        {severity} - {getSeverityText(severity)}
      </span>
    </div>
  );
}
