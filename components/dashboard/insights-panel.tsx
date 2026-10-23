"use client";

import {
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { AnalysisResults } from "@/components/dashboard/analysis-results";
import type { AnalysisResponse } from "@/lib/financial/analysis-schema";

export type AnalysisStatus = "idle" | "loading" | "success" | "error";

type InsightsPanelProps = {
  status: AnalysisStatus;
  result: AnalysisResponse | null;
  error: string | null;
  hasReport: boolean;
  reportName: string | null;
  onAnalyze: () => void;
  onUpload: () => void;
};

export function InsightsPanel({
  status,
  result,
  error,
  hasReport,
  reportName,
  onAnalyze,
  onUpload,
}: InsightsPanelProps) {
  const insights = [
    {
      icon: Lightbulb,
      title: "Key findings",
      description: "A concise read on what is driving the business.",
      accent: "cyan",
      findings: result?.analysis.keyDevelopments ?? [],
    },
    {
      icon: AlertTriangle,
      title: "Potential risks",
      description: "Signals that may deserve a closer look.",
      accent: "amber",
      findings: result?.analysis.risks ?? [],
    },
    {
      icon: HeartPulse,
      title: "Financial health",
      description: "A balanced view of stability and resilience.",
      accent: "violet",
      findings: [...(result?.analysis.profitability ?? []), ...(result?.analysis.cashFlow ?? [])],
    },
  ];

  const isLoading = status === "loading";
  const canAnalyze = hasReport && status !== "loading" && status !== "success";
  const buttonLabel =
    status === "loading" ? "Analyzing report…" :
    status === "error" ? "Retry analysis" :
    status === "success" ? "Analysis complete" :
    hasReport ? "Analyse report" : "Upload annual report";

  return (
    <section aria-labelledby="analysis-title" className="analysis-section" id="analysis">
      <div className="section-heading analysis-heading">
        <div>
          <span className="section-kicker">REPORT INSIGHTS</span>
          <h2 id="analysis-title">Analysis, with context.</h2>
          <p>Useful signals, grounded in the numbers.</p>
        </div>
        <span className={`analysis-unavailable${hasReport ? " report-available" : ""}`}>
          <span /> {hasReport ? "REPORT READY" : "AWAITING REPORT"}
        </span>
      </div>

      <div className="insights-grid">
        {insights.map(({ icon: Icon, title, description, accent, findings }) => (
          <article className="panel insight-card" key={title}>
            <span className={`insight-icon ${accent}`}><Icon size={16} strokeWidth={1.8} /></span>
            <h3>{title}</h3>
            <p>{description}</p>
            {findings.length > 0 ? (
              <div className="insight-result">
                <strong>{findings[0].title}</strong>
                <span>{findings[0].explanation}</span>
                {findings[0].evidence.map(({ page }, index) => (
                  <small key={`${page}-${index}`}>Source · p. {page}</small>
                ))}
              </div>
            ) : null}
            <span className="insight-empty-label">
              {findings.length > 0
                ? "Evidence from your report"
                : result
                  ? "No findings in this category"
                  : status === "loading"
                    ? "Analysis in progress"
                    : hasReport
                      ? "Ready to analyse"
                      : "Awaiting analysis"}
            </span>
          </article>
        ))}
      </div>

      <article className={`analyst-panel${status === "loading" ? " is-processing" : ""}`} id="ai-analyst">
        <div className="analyst-emblem"><Sparkles size={18} /></div>
        <div className="analyst-copy">
          <div className="analyst-heading">
            <h3>AI analyst</h3>
          </div>
          <p className="analyst-description">Understand the numbers behind the business.</p>
          <p className="analyst-supporting">
            {reportName
              ? `Get an evidence-based analysis of financial performance, important changes and potential risks using ${reportName}.`
              : "Get an evidence-based analysis of financial performance, important changes and potential risks using your uploaded annual report."}
          </p>
        </div>
        <button
          className="analyst-action"
          disabled={hasReport ? !canAnalyze : false}
          onClick={hasReport ? onAnalyze : onUpload}
          type="button"
        >
          {isLoading && <span aria-hidden="true" className="analysis-spinner" />}
          {buttonLabel} <ArrowRight size={16} />
        </button>
      </article>

      {isLoading && (
        <p className="analysis-processing" role="status">
          Reviewing financial performance and report evidence…
        </p>
      )}

      {error && (
        <div className="analysis-error" role="alert">
          <strong>Analysis couldn’t be completed</strong>
          <span>{error}</span>
        </div>
      )}

      {status === "success" && result && <AnalysisResults result={result} />}
    </section>
  );
}
