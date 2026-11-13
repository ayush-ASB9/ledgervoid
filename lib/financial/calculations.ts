import type {
  CalculatedFinancialMetric,
  ReportPage,
  VerifiedFinancialFact,
} from "@/lib/financial/types";
import { extractStatementFacts } from "@/lib/financial/statements";

const labels: {
  metric: VerifiedFinancialFact["metric"];
  expression: RegExp;
}[] = [
  { metric: "revenue", expression: /\b(?:revenue from operations|total revenue|revenue|total income)\b/i },
  { metric: "expenses", expression: /\b(?:total operating expenses|operating expenses|total expenses)\b/i },
  { metric: "netProfit", expression: /\b(?:profit after tax|net profit|net loss)\b/i },
  {
    metric: "cashFlow",
    expression: /\b(?:net cash (?:generated from|from) operating activities|cash generated from operations|operating cash flow)\b/i,
  },
];

const numberPattern = /(?:₹|INR|Rs\.?)\s*\(?-?\d[\d,]*(?:\.\d+)?\)?(?:\s*(?:crores?|cr|lakhs?|million|billion))?/gi;
const unitPattern = /(?:₹|INR|Rs\.?)\s*(?:in\s+)?(crores?|cr|lakhs?|million|billion)\b/i;
const pageUnitPattern = /(?:₹|INR|Rs\.?)\s*(?:in\s+)?(crores?|cr|lakhs?|million|billion)\b/i;

function canonicalUnit(text: string): string {
  const match = text.match(unitPattern);
  if (!match) return "INR";

  const unit = match[1].toLowerCase();
  if (unit.startsWith("crore") || unit === "cr") return "INR crore";
  if (unit.startsWith("lakh")) return "INR lakh";
  if (unit === "million") return "INR million";
  return "INR billion";
}

function parseAmount(text: string): number | null {
  const match = text.match(/(?:₹|INR|Rs\.?)\s*(\()?(-?\d[\d,]*(?:\.\d+)?)\)?/i);
  if (!match) return null;

  const value = Number(match[2].replaceAll(",", ""));
  if (!Number.isFinite(value)) return null;
  return match[1] && value > 0 ? -value : value;
}

function findPeriod(text: string): number | null {
  const match = text.match(/\b(?:FY|financial year)\s*(20\d{2})\b|\b(20\d{2})\b/i);
  const year = Number(match?.[1] ?? match?.[2]);
  return Number.isInteger(year) ? year : null;
}

export function extractVerifiedFinancialFacts(pages: ReportPage[]): VerifiedFinancialFact[] {
  const facts: VerifiedFinancialFact[] = [];

  for (const page of pages) {
    const pageUnit = page.text
      .split(/\r?\n/)
      .slice(0, 8)
      .map((line) => line.match(pageUnitPattern)?.[1])
      .find(Boolean);
    const defaultUnit = pageUnit ? canonicalUnit(`INR ${pageUnit}`) : "INR";

    for (const line of page.text.split(/\r?\n/)) {
      for (const { metric, expression } of labels) {
        const match = expression.exec(line);
        if (!match) continue;

        const amounts = [...line.matchAll(numberPattern)];
        if (amounts.length !== 1) continue;

        const amount = parseAmount(amounts[0][0]);
        if (amount === null) continue;

        const explicitUnit = amounts[0][0].match(unitPattern);
        const unit = explicitUnit ? canonicalUnit(amounts[0][0]) : defaultUnit;
        const label = match[0];

        facts.push({
          metric,
          label,
          value: amount,
          unit,
          period: findPeriod(line),
          page: page.page,
          evidence: line.trim().slice(0, 500),
        });
      }
    }
  }

  return facts;
}

/**
 * Figures from the report's income and cash flow statements, falling back to
 * single-amount lines such as "Net profit INR 190 crore" for metrics the
 * statements do not cover.
 */
export function extractReportedFacts(pages: ReportPage[]): VerifiedFinancialFact[] {
  const statementFacts = extractStatementFacts(pages);
  const covered = new Set(statementFacts.map(({ metric }) => metric));
  return [
    ...statementFacts,
    ...extractVerifiedFinancialFacts(pages).filter(({ metric }) => !covered.has(metric)),
  ];
}

export function calculateFinancialMetrics(
  facts: VerifiedFinancialFact[],
): CalculatedFinancialMetric[] {
  const metrics: CalculatedFinancialMetric[] = [];
  const revenueByYear = new Map<number, VerifiedFinancialFact>();
  const profitByYear = new Map<number, VerifiedFinancialFact>();

  for (const fact of facts) {
    if (fact.period === null) continue;
    if (fact.metric === "revenue") revenueByYear.set(fact.period, fact);
    if (fact.metric === "netProfit") profitByYear.set(fact.period, fact);
  }

  const revenueYears = [...revenueByYear.keys()].sort((a, b) => a - b);
  if (revenueYears.length >= 2) {
    const previous = revenueByYear.get(revenueYears[revenueYears.length - 2]);
    const current = revenueByYear.get(revenueYears[revenueYears.length - 1]);
    if (previous && current && previous.unit === current.unit && previous.value !== 0) {
      metrics.push({
        label: "Revenue year-over-year change",
        value: ((current.value - previous.value) / Math.abs(previous.value)) * 100,
        unit: "%",
        period: `${previous.period}-${current.period}`,
        evidence: [
          { page: previous.page, quote: previous.evidence },
          { page: current.page, quote: current.evidence },
        ],
      });
    }
  }

  for (const [year, profit] of profitByYear) {
    const revenue = revenueByYear.get(year);
    if (!revenue || revenue.value === 0 || revenue.unit !== profit.unit) continue;

    metrics.push({
      label: "Net profit margin",
      value: (profit.value / revenue.value) * 100,
      unit: "%",
      period: String(year),
      evidence: [
        { page: revenue.page, quote: revenue.evidence },
        { page: profit.page, quote: profit.evidence },
      ],
    });
  }

  return metrics;
}
