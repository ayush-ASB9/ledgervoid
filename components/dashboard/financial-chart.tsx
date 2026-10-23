"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { FinancialPeriod, VerifiedFinancialFact } from "@/lib/financial/types";

type ChartView = "performance" | "profitability" | "year-over-year";
type FinancialSeries = "revenue" | "expenses" | "profit";
type SeriesKey = FinancialSeries | "revenueChange" | "profitChange";

const views: { id: ChartView; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "profitability", label: "Profitability" },
  { id: "year-over-year", label: "Year over year" },
];

const dataKeys: Record<ChartView, { key: SeriesKey; color: string }[]> = {
  performance: [
    { key: "revenue", color: "#53d9cf" },
    { key: "expenses", color: "#e6aa61" },
  ],
  profitability: [{ key: "profit", color: "#9d8cf3" }],
  "year-over-year": [
    { key: "revenueChange", color: "#53d9cf" },
    { key: "profitChange", color: "#9d8cf3" },
  ],
};

function getPercentageChange(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined || previous <= 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function getSeriesLabel(name: string | number | undefined): string {
  if (name === "revenue" || name === "revenueChange") return "Revenue";
  if (name === "expenses") return "Expenses";
  if (name === "profit" || name === "profitChange") return "Net profit";
  return String(name);
}

function getFinancialPeriods(
  facts: VerifiedFinancialFact[],
): { data: FinancialPeriod[]; unit: string | null } {
  const periods = new Map<number, FinancialPeriod>();
  const unitCounts = new Map<string, number>();

  for (const fact of facts) {
    if (fact.period === null) continue;
    unitCounts.set(fact.unit, (unitCounts.get(fact.unit) ?? 0) + 1);
  }

  const selectedUnit = [...unitCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  if (!selectedUnit) return { data: [], unit: null };

  for (const fact of facts) {
    if (fact.period === null || fact.unit !== selectedUnit) continue;
    const period: FinancialPeriod = periods.get(fact.period) ?? { period: `FY ${fact.period}` };
    const fieldByMetric: Record<VerifiedFinancialFact["metric"], FinancialSeries | null> = {
      revenue: "revenue",
      expenses: "expenses",
      netProfit: "profit",
      cashFlow: null,
    };
    const key = fieldByMetric[fact.metric];
    if (!key) continue;

    if (key === "revenue" && period.revenue === undefined) period.revenue = fact.value;
    if (key === "expenses" && period.expenses === undefined) period.expenses = fact.value;
    if (key === "profit" && period.profit === undefined) period.profit = fact.value;
    periods.set(fact.period, period);
  }

  return {
    data: [...periods.values()].sort(
      (left, right) => Number(left.period.slice(3)) - Number(right.period.slice(3)),
    ),
    unit: selectedUnit,
  };
}

export function FinancialChart({
  facts,
  hasReport,
}: {
  facts: VerifiedFinancialFact[];
  hasReport: boolean;
}) {
  const [activeView, setActiveView] = useState<ChartView>("performance");
  const financialPeriods = getFinancialPeriods(facts);
  const chartData = financialPeriods.data;
  const displayedData: FinancialPeriod[] =
    activeView === "year-over-year"
      ? chartData.map((period, index) => {
          const previous = chartData[index - 1];
          if (
            !previous ||
            Number(period.period.slice(3)) !== Number(previous.period.slice(3)) + 1
          ) {
            return { period: period.period };
          }

          return {
            period: period.period,
            revenueChange: getPercentageChange(period.revenue, previous.revenue),
            profitChange: getPercentageChange(period.profit, previous.profit),
          };
        })
      : chartData;
  const availableSeries = dataKeys[activeView].filter(({ key }) =>
    displayedData.some((period) => period[key] !== undefined),
  );

  return (
    <section aria-labelledby="financial-chart-title" className="panel chart-panel">
      <div className="panel-header chart-panel-header">
        <div className="panel-title-group">
          <span className="panel-icon chart-title-icon"><BarChart3 size={16} /></span>
          <div>
            <h2 id="financial-chart-title">Financial performance</h2>
            <p>
              {activeView === "year-over-year"
                ? "Annual percentage change"
                : financialPeriods.unit
                  ? `Revenue, expenses & profitability · ${financialPeriods.unit}`
                  : "Revenue, expenses & profitability over time"}
            </p>
          </div>
        </div>
      </div>

      <div aria-label="Choose financial chart" className="chart-tabs" role="tablist">
        {views.map(({ id, label }) => (
          <button
            aria-selected={activeView === id}
            className={`chart-tab${activeView === id ? " is-active" : ""}`}
            key={id}
            onClick={() => setActiveView(id)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chart-area">
        <ResponsiveContainer height="100%" minHeight={220} minWidth={0} width="100%">
          <AreaChart data={displayedData} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#53d9cf" stopOpacity={0.14} />
                <stop offset="95%" stopColor="#53d9cf" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenses-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#e6aa61" stopOpacity={0.11} />
                <stop offset="95%" stopColor="#e6aa61" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profit-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#9d8cf3" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#9d8cf3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(146, 160, 175, 0.09)"
              strokeDasharray="3 6"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="period"
              tick={{ fill: "#a6b0ba", fontSize: 14 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#a6b0ba", fontSize: 14 }}
              tickFormatter={(value) =>
                activeView === "year-over-year"
                  ? `${Number(value).toFixed(0)}%`
                  : Number(value).toLocaleString("en-IN", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })
              }
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "#171b21",
                border: "1px solid #2b333d",
                borderRadius: 8,
                color: "#edf2f5",
                fontSize: 14,
              }}
              formatter={(value, name) => [
                activeView === "year-over-year"
                  ? `${Number(value).toFixed(1)}%`
                  : `${Number(value).toLocaleString("en-IN")} ${financialPeriods.unit ?? ""}`.trim(),
                getSeriesLabel(name),
              ]}
            />
            {availableSeries.map(({ key, color }) => (
              <Area
                dataKey={key}
                fill={`url(#${key === "revenue" || key === "revenueChange" ? "revenue" : key === "expenses" ? "expenses" : "profit"}-fill)`}
                key={key}
                dot={displayedData.length === 1 ? { r: 4, fill: color, strokeWidth: 0 } : false}
                stroke={color}
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        {availableSeries.length === 0 && (
          <div className="chart-empty-state">
            <span className="chart-empty-mark"><BarChart3 size={17} /></span>
            <strong>{hasReport ? "No comparable figures found" : "No financial data yet"}</strong>
            <span>Financial trends appear when the report provides period values.</span>
          </div>
        )}
      </div>

      <div aria-label="Chart legend" className="chart-legend">
        {(activeView === "performance"
          ? [
              { name: "Revenue", color: "cyan" },
              { name: "Expenses", color: "amber" },
            ]
          : activeView === "profitability"
            ? [{ name: "Net profit", color: "violet" }]
            : [
                { name: "Revenue", color: "cyan" },
                { name: "Net profit", color: "violet" },
              ]
        ).map(({ name, color }) => (
          <span className="legend-item" key={name}>
            <i className={`legend-dot ${color}`} />
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
