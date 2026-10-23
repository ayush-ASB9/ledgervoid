"use client";

import { useRef, useState } from "react";
import { Activity, Banknote, CircleDollarSign, Wallet } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ReportUpload } from "@/components/dashboard/report-upload";
import { analysisResponseSchema, type AnalysisResponse } from "@/lib/financial/analysis-schema";
import type { FinancialMetric } from "@/lib/financial/types";
import type {
  CalculatedFinancialMetric,
  ReportCoverage,
  ReportPage,
  VerifiedFinancialFact,
} from "@/lib/financial/types";

type ExtractedReport = {
  name: string;
  pages: ReportPage[];
  coverage: ReportCoverage;
  reportedFacts: VerifiedFinancialFact[];
  calculatedMetrics: CalculatedFinancialMetric[];
};

export function DashboardOverview() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [report, setReport] = useState<ExtractedReport | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  function handleReportReady(nextReport: ExtractedReport | null) {
    setReport(nextReport);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisResult(null);
  }

  async function analyzeReport() {
    if (!report || analysisStatus === "loading" || analysisStatus === "success") return;

    setAnalysisStatus("loading");
    setAnalysisError(null);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: report.pages,
          coverage: report.coverage,
        }),
      });

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        setAnalysisStatus("error");
        setAnalysisError("Analysis is temporarily unavailable. Please try again.");
        return;
      }

      if (!response.ok) {
        setAnalysisStatus("error");
        setAnalysisError("Analysis is temporarily unavailable. Please try again.");
        return;
      }

      const parsed = analysisResponseSchema.safeParse(responseBody);
      if (!parsed.success) {
        setAnalysisStatus("error");
        setAnalysisError("Analysis is temporarily unavailable. Please try again.");
        return;
      }

      setAnalysisResult(parsed.data);
      setAnalysisStatus("success");
    } catch {
      setAnalysisStatus("error");
      setAnalysisError("Analysis is temporarily unavailable. Please try again.");
    }
  }

  function getReportedMetric(
    metric: VerifiedFinancialFact["metric"],
    label: string,
  ): FinancialMetric {
    const fact = [...(report?.reportedFacts ?? [])]
      .filter((candidate) => candidate.metric === metric)
      .sort((left, right) => (right.period ?? 0) - (left.period ?? 0))[0];

    if (!fact) {
      return {
        label,
        value: null,
        description: report ? "Not found in report" : "Awaiting report",
      };
    }

    return {
      label,
      value: fact.value,
      displayValue: `${fact.value.toLocaleString("en-IN")} ${fact.unit}`,
      description: fact.period ? `FY ${fact.period} · p. ${fact.page}` : `Reported · p. ${fact.page}`,
    };
  }

  const dashboardMetrics = [
    { metric: getReportedMetric("revenue", "Revenue"), accent: "cyan" as const, icon: Banknote },
    { metric: getReportedMetric("expenses", "Operating expenses"), accent: "amber" as const, icon: Activity },
    { metric: getReportedMetric("netProfit", "Net profit"), accent: "violet" as const, icon: CircleDollarSign },
    { metric: getReportedMetric("cashFlow", "Operating cash flow"), accent: "green" as const, icon: Wallet },
  ];

  return (
    <div className="app-shell" id="overview">
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="app-main">
        <Topbar
          onMenuClick={() => setIsSidebarOpen(true)}
          onUploadClick={() => fileInputRef.current?.click()}
        />
        <main className="dashboard-content">
          <div className="page-intro">
            <div>
              <p className="welcome-line">FINANCIAL RESEARCH</p>
              <h2>Financial insights</h2>
              <p className="page-description">
                {report ? `${report.name} is ready for analysis.` : "Annual report figures and analysis, in one place."}
              </p>
            </div>
            <span className={`data-status${report ? " report-ready" : ""}`}>
              <span /> {report ? "REPORT READY" : "AWAITING REPORT"}
            </span>
          </div>

          <ReportUpload fileInputRef={fileInputRef} onReportReady={handleReportReady} />

          <section aria-labelledby="metrics-title" className="metrics-section">
            <div className="section-heading compact-heading">
              <div>
                <span className="section-kicker">AT A GLANCE</span>
                <h2 id="metrics-title">Key financials</h2>
              </div>
              <span className="currency-note">AS REPORTED <span>·</span> ANNUAL</span>
            </div>
            <div className="metrics-grid">
              {dashboardMetrics.map(({ metric, accent, icon }) => (
                <MetricCard
                  accent={accent}
                  icon={icon}
                  key={metric.label}
                  metric={metric}
                />
              ))}
            </div>
          </section>

          <section aria-label="Financial charts" className="charts-grid">
            <FinancialChart facts={report?.reportedFacts ?? []} hasReport={report !== null} />
            <ExpenseChart hasReport={report !== null} />
          </section>

          <InsightsPanel
            error={analysisError}
            hasReport={report !== null}
            onAnalyze={analyzeReport}
            onUpload={() => fileInputRef.current?.click()}
            reportName={report?.name ?? null}
            result={analysisResult}
            status={analysisStatus}
          />

          <footer className="dashboard-footer">
            <span>LEDGERVOID <span className="footer-dot">·</span> FINANCIAL INTELLIGENCE</span>
            <span>Numbers first. Always.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
