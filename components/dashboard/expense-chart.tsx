"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import type { ExpenseBreakdown } from "@/lib/financial/types";
import { numberLocale } from "@/lib/utils";

const colors = ["#53d9cf", "#9d8cf3", "#e6aa61", "#6bca9e", "#5aa9e6", "#e67e9b", "#c9cf6b", "#8b96a3"];
const MAX_SLICES = 7;

/** Keeps the largest categories and groups the rest as "Other" so the chart stays readable. */
function slices(breakdown: ExpenseBreakdown) {
  const sorted = [...breakdown.categories].sort((left, right) => right.amount - left.amount);
  if (sorted.length <= MAX_SLICES + 1) return sorted;
  const rest = sorted.slice(MAX_SLICES).reduce((sum, { amount }) => sum + amount, 0);
  return [...sorted.slice(0, MAX_SLICES), { name: "Other", amount: rest }];
}

export function ExpenseChart({
  breakdown,
  hasReport,
}: {
  breakdown: ExpenseBreakdown | null;
  hasReport: boolean;
}) {
  const data = breakdown ? slices(breakdown) : [];
  const locale = numberLocale(breakdown?.unit);
  const format = (value: number) => value.toLocaleString(locale);

  return (
    <section aria-labelledby="expense-chart-title" className="panel expense-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon expense-title-icon"><PieChartIcon size={16} /></span>
          <div>
            <h2 id="expense-chart-title">Expense breakdown</h2>
            <p>
              {breakdown ? `FY ${breakdown.period} · ${breakdown.unit}` : "Where the money goes"}
            </p>
          </div>
        </div>
        <span className="panel-period-label">BY CATEGORY</span>
      </div>
      <div className="expense-chart-body">
        {breakdown ? (
          <div className="expense-chart-layout">
            <div className="donut-chart">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    innerRadius="62%"
                    isAnimationActive={false}
                    nameKey="name"
                    outerRadius="100%"
                    paddingAngle={1.5}
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell fill={colors[index % colors.length]} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#171b21",
                      border: "1px solid #2b333d",
                      borderRadius: 8,
                      color: "#edf2f5",
                      fontSize: 14,
                    }}
                    formatter={(value, name) => [`${format(Number(value))} ${breakdown.unit}`, name]}
                    itemStyle={{ color: "#edf2f5" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span>{format(breakdown.total)}</span>
                <small>TOTAL</small>
              </div>
            </div>
            <ul aria-label="Expense categories" className="expense-categories">
              {data.map((entry, index) => (
                <li key={entry.name}>
                  <i style={{ background: colors[index % colors.length] }} />
                  <span>{entry.name}</span>
                  <strong>{((entry.amount / breakdown.total) * 100).toFixed(1)}%</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="expense-empty">
            <span className="expense-empty-icon"><PieChartIcon size={20} /></span>
            <strong>{hasReport ? "No category breakdown found" : "No financial data yet"}</strong>
            <span>Category details appear when they are disclosed in the report.</span>
          </div>
        )}
      </div>
      <div className="expense-legend">
        <span>{breakdown ? `Lines of ${breakdown.label.toLowerCase()}` : "Expense categories"}</span>
        <span>{breakdown ? `As reported · p. ${breakdown.page}` : "As reported"}</span>
      </div>
    </section>
  );
}
