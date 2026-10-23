import type { LucideIcon } from "lucide-react";
import type { FinancialMetric } from "@/lib/financial/types";

type MetricCardProps = {
  metric: FinancialMetric;
  icon: LucideIcon;
  accent: "cyan" | "amber" | "violet" | "green";
};

export function MetricCard({ metric, icon: Icon, accent }: MetricCardProps) {
  const formattedValue =
    metric.displayValue ??
    (metric.value === null
      ? "—"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: metric.currency ?? "INR",
          maximumFractionDigits: 0,
          notation: "compact",
        }).format(metric.value));

  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className="metric-label">{metric.label}</span>
        <span className={`metric-icon ${accent}`}>
          <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
        </span>
      </div>
      <div className="metric-value-row">
        <strong className={metric.value === null ? "is-unavailable" : ""}>
          {formattedValue}
        </strong>
      </div>
      <p>{metric.description}</p>
    </article>
  );
}
