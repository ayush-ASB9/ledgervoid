import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";
import type { AnalysisFinding } from "@/lib/financial/types";
import type { AnalysisResponse } from "@/lib/financial/analysis-schema";

const classificationLabels = {
  fact: "Reported fact",
  calculation: "Calculated metric",
  interpretation: "Analysis",
  hypothesis: "Possible explanation",
  missing: "Not reported",
} as const;

function FindingList({
  title,
  items,
}: {
  title: string;
  items: AnalysisFinding[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="result-group">
      <h4>{title}</h4>
      <div className="result-findings">
        {items.map((finding, index) => (
          <article className="result-finding" key={`${finding.title}-${index}`}>
            <div className="finding-heading">
              <strong>{finding.title}</strong>
              <span className={`finding-classification ${finding.classification}`}>
                {classificationLabels[finding.classification]}
              </span>
            </div>
            <p>{finding.explanation}</p>
            {finding.evidence.map((evidence, evidenceIndex) => (
              <blockquote key={`${evidence.page}-${evidenceIndex}`}>
                “{evidence.quote}”
                <span>p. {evidence.page}</span>
              </blockquote>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

export function AnalysisResults({ result }: { result: AnalysisResponse }) {
  const { analysis, reportedFacts, calculatedMetrics } = result;

  return (
    <div className="analysis-results" aria-live="polite">
      <section className="result-summary">
        <div className="result-summary-icon"><CheckCircle2 size={16} /></div>
        <div>
          <div className="finding-heading">
            <h4>Executive summary</h4>
            <span className={`finding-classification ${analysis.executiveSummary.classification}`}>
              {classificationLabels[analysis.executiveSummary.classification]}
            </span>
          </div>
          <strong>{analysis.executiveSummary.title}</strong>
          <p>{analysis.executiveSummary.explanation}</p>
          {analysis.executiveSummary.evidence.map((evidence, index) => (
            <blockquote key={`${evidence.page}-${index}`}>
              “{evidence.quote}”
              <span>p. {evidence.page}</span>
            </blockquote>
          ))}
        </div>
      </section>

      <div className="analysis-result-columns">
        <FindingList title="Revenue trends" items={analysis.revenueTrends} />
        <FindingList title="Profitability" items={analysis.profitability} />
        <FindingList title="Key developments" items={analysis.keyDevelopments} />
        <FindingList title="Cash flow" items={analysis.cashFlow} />
        <FindingList title="Potential risks" items={analysis.risks} />
      </div>

      {(reportedFacts.length > 0 || calculatedMetrics.length > 0) && (
        <section className="result-group">
          <h4>Reported and calculated financials</h4>
          <p className="result-disclaimer">
            Reported figures come from the document. Calculated metrics are labelled separately.
          </p>
          <div className="verified-data-list">
            {reportedFacts.map((fact, index) => (
              <div className="verified-data-row" key={`${fact.metric}-${fact.page}-${index}`}>
                <span>{fact.label}{fact.period ? ` · ${fact.period}` : ""}</span>
                <strong>{fact.value.toLocaleString("en-IN")} {fact.unit}</strong>
                <span>p. {fact.page}</span>
              </div>
            ))}
            {calculatedMetrics.map((metric) => (
              <div className="verified-data-row calculated" key={`${metric.label}-${metric.period}`}>
                <span>{metric.label} · {metric.period}</span>
                <strong>{metric.value.toFixed(2)}{metric.unit}</strong>
                <span>
                  {metric.evidence.map(({ page }) => page).filter((page, index, all) => all.indexOf(page) === index)
                    .map((page) => `p. ${page}`).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.questions.length > 0 && (
        <section className="result-group">
          <h4><CircleHelp size={13} /> Questions to investigate</h4>
          <ul className="analyst-questions">
            {analysis.questions.map((item, index) => (
              <li key={`${item.question}-${index}`}>
                <span>{item.question}</span>
                {item.evidence.map((evidence, evidenceIndex) => (
                  <span className="question-citation" key={`${evidence.page}-${evidenceIndex}`}>
                    p. {evidence.page}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.limitations.length > 0 && (
        <section className="result-limitations">
          <AlertTriangle size={14} />
          <div>
            <strong>Limitations</strong>
            <ul>{analysis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          </div>
        </section>
      )}

      <div className="analysis-result-footer">
        <span>Analysis is based on the information available in this report and is not an audited conclusion.</span>
      </div>
    </div>
  );
}
