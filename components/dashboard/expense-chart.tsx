import { PieChart as PieChartIcon } from "lucide-react";

export function ExpenseChart({ hasReport }: { hasReport: boolean }) {
  return (
    <section aria-labelledby="expense-chart-title" className="panel expense-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon expense-title-icon"><PieChartIcon size={16} /></span>
          <div>
            <h2 id="expense-chart-title">Expense breakdown</h2>
            <p>Where the money goes</p>
          </div>
        </div>
        <span className="panel-period-label">BY CATEGORY</span>
      </div>
      <div className="expense-chart-body">
        <div className="expense-empty">
          <span className="expense-empty-icon"><PieChartIcon size={20} /></span>
          <strong>{hasReport ? "No category breakdown found" : "No financial data yet"}</strong>
          <span>Category details appear when they are disclosed in the report.</span>
        </div>
      </div>
      <div className="expense-legend">
        <span>Expense categories</span>
        <span>As reported</span>
      </div>
    </section>
  );
}
