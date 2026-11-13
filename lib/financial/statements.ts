import type { ExpenseBreakdown, ReportPage, VerifiedFinancialFact } from "@/lib/financial/types";

/**
 * Reads the income statement and cash flow statement tables of an annual report.
 *
 * Statement pages put the unit in a header such as "(In ₹ crore)" or "(In millions)",
 * list the fiscal years once as a header row such as "2025 2024", and then give one
 * column per year on each line, such as "Revenue from operations 2.18 1,62,990 1,53,670".
 */

const statementHeading =
  /^(?:(?:consolidated|standalone)\s+)?(?:statements?\s+of\s+(?:profit\s+and\s+loss|operations|income|earnings|cash\s+flows?)|income\s+statements?|cash\s+flow\s+statements?)\b/i;
const continuedHeading = /\b(?:contd|continued)\b/i;
// Words allowed around the years in a column header row, such as
// "Particulars Note Year ended 31 March 2025 Year ended 31 March 2024".
const yearHeaderWords =
  /\b(?:particulars|notes?|no|fy|fiscal|years?|ended|ending|as|at|on|for|the|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}(?:st|nd|rd|th)?)\b|[.,/()\-–]/gi;
const unitLine =
  /\bin\s+(₹|INR|Rs\.?|US\$|USD|\$|€|EUR|£|GBP)?\s*(crores?|cr|lakhs?|millions?|billions?|thousands?)\b/i;

const currencyNames: Record<string, string> = {
  "₹": "INR",
  inr: "INR",
  rs: "INR",
  "rs.": "INR",
  $: "USD",
  usd: "USD",
  "us$": "USD",
  "€": "EUR",
  eur: "EUR",
  "£": "GBP",
  gbp: "GBP",
};

const metricLabels: {
  metric: VerifiedFinancialFact["metric"];
  kind: Statement["kind"];
  label: RegExp;
}[] = [
  {
    metric: "revenue",
    kind: "income",
    label: /^(?:total\s+)?(?:net\s+)?(?:revenues?|sales)(?:\s+from\s+operations)?$|^total\s+net\s+sales$/i,
  },
  { metric: "expenses", kind: "income", label: /^total\s+(?:operating\s+)?(?:costs\s+and\s+)?expenses$/i },
  {
    metric: "netProfit",
    kind: "income",
    label: /^(?:net\s+(?:income|profit|earnings|loss)|(?:profit|loss)\s+for\s+the\s+(?:year|period)|profit\s+after\s+tax)$/i,
  },
  {
    metric: "cashFlow",
    kind: "cashFlow",
    label: /^(?:net\s+)?cash\s+(?:generated\s+(?:by|from)|provided\s+by|from|flows?\s+from)\s+operating\s+activities$/i,
  },
];

type Row = { label: string; values: number[]; line: string };

type Statement = {
  kind: "income" | "cashFlow";
  consolidated: boolean;
  page: number;
  unit: string;
  years: number[];
  rows: Row[];
};

/** True when the page starts with an income statement or cash flow statement heading. */
export function isStatementPage(text: string): boolean {
  return text.split(/\r?\n/, 6).some((line) => statementHeading.test(line.trim()));
}

/** The fiscal years of a column header row, such as "2025 2024", or null for any other line. */
function readYears(line: string): number[] | null {
  const years = line.match(/\b20\d{2}\b/g)?.map(Number) ?? [];
  if (years.length < 2 || years.length > 4 || new Set(years).size !== years.length) return null;
  const rest = line.replace(/\b20\d{2}\b/g, " ").replace(yearHeaderWords, " ").trim();
  return rest ? null : years;
}

function canonicalUnit(currency: string | undefined, scale: string, fallbackCurrency: string): string {
  const name = (currency && currencyNames[currency.toLowerCase()]) || fallbackCurrency;
  const lower = scale.toLowerCase();
  const word = lower.startsWith("crore") || lower === "cr"
    ? "crore"
    : lower.startsWith("lakh")
      ? "lakh"
      : lower.replace(/s$/, "");
  return `${name} ${word}`;
}

/** Parses "1,62,990", "(2,570)", or "-12.5"; parentheses mean a negative amount. */
function parseValue(token: string): number | null {
  if (!/^\(?-?\d[\d,]*(?:\.\d+)?\)?$/.test(token)) return null;
  const value = Number(token.replace(/[(),-]/g, ""));
  if (!Number.isFinite(value)) return null;
  return token.startsWith("(") || token.startsWith("-") ? -value : value;
}

/** Splits a line into its label and one value per year, dropping note references. */
function parseRow(line: string, columns: number): Row | null {
  const tokens = line.replace(/[$₹€£]/g, " ").trim().split(/\s+/);
  const values: number[] = [];
  while (tokens.length > 0 && values.length < columns) {
    const value = parseValue(tokens[tokens.length - 1]);
    if (value === null) break;
    values.unshift(value);
    tokens.pop();
  }
  if (values.length !== columns) return null;

  // Note references such as "2.18" or "2.2, 2.4.2 and 2.21" sit between label and values.
  const label = tokens.join(" ")
    .replace(/(?:[\s,]+(?:\d+(?:\.\d+)*[a-z]?|and))+$/i, "")
    .replace(/[:,]$/, "")
    .trim();
  if (!/[a-z]/i.test(label) || /\d$/.test(label)) return null;
  return { label, values, line: line.trim() };
}

function readStatement(
  page: number,
  text: string,
  previous: Statement | undefined,
  fallbackCurrency: string,
): Statement | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headingIndex = lines.slice(0, 6).findIndex((line) => statementHeading.test(line));
  if (headingIndex === -1) return null;
  const heading = lines[headingIndex];
  const kind = /cash\s+flow/i.test(heading) ? "cashFlow" : "income";
  const consolidated = /consolidated/i.test(heading);

  let unit: string | null = null;
  let years: number[] = [];
  let firstRow = -1;
  for (let index = headingIndex + 1; index < Math.min(lines.length, headingIndex + 14); index += 1) {
    const unitMatch = lines[index].match(unitLine);
    if (unitMatch && !unit) unit = canonicalUnit(unitMatch[1], unitMatch[2], fallbackCurrency);
    const headerYears = readYears(lines[index]);
    if (headerYears) {
      years = headerYears;
      firstRow = index + 1;
      break;
    }
  }

  // A "(contd.)" page repeats the years but not the unit of the page before it.
  if (
    !unit &&
    continuedHeading.test(heading) &&
    previous?.kind === kind &&
    previous.consolidated === consolidated &&
    previous.page === page - 1
  ) {
    unit = previous.unit;
  }
  if (!unit || years.length === 0) return null;

  const rows = lines.slice(firstRow).flatMap((line) => parseRow(line, years.length) ?? []);
  if (rows.length < 2) return null;
  return { kind, consolidated, page, unit, years, rows };
}

const rupee = /₹|\bINR\b|\bRs\.\s/;

function readStatements(pages: ReportPage[]): Statement[] {
  // Statement headers often give only the scale ("In millions"), so take the currency
  // from the amounts on the page, then from the rest of the report.
  const reportCurrency = pages.some(({ text }) => rupee.test(text)) ? "INR" : "USD";
  const statements: Statement[] = [];
  for (const { page, text } of pages) {
    const pageCurrency = rupee.test(text) ? "INR" : /\$/.test(text) ? "USD" : reportCurrency;
    const statement = readStatement(page, text, statements.at(-1), pageCurrency);
    if (statement) statements.push(statement);
  }

  // When a report has both, use the consolidated statements, which cover the whole group.
  return statements.some(({ consolidated }) => consolidated)
    ? statements.filter(({ consolidated }) => consolidated)
    : statements;
}

/** Facts for revenue, total expenses, net profit, and operating cash flow, one per year. */
export function extractStatementFacts(pages: ReportPage[]): VerifiedFinancialFact[] {
  const facts: VerifiedFinancialFact[] = [];
  const seen = new Set<string>();

  for (const statement of readStatements(pages)) {
    for (const { metric, kind, label } of metricLabels) {
      if (statement.kind !== kind) continue;
      const row = statement.rows.find((candidate) => label.test(candidate.label));
      if (!row) continue;

      statement.years.forEach((year, index) => {
        const key = `${metric}:${year}`;
        if (seen.has(key)) return;
        seen.add(key);
        facts.push({
          metric,
          label: row.label,
          value: row.values[index],
          unit: statement.unit,
          period: year,
          page: statement.page,
          evidence: row.line.slice(0, 500),
        });
      });
    }
  }

  return facts;
}

/**
 * The expense lines directly above a "Total expenses" or "Total operating expenses"
 * row for the latest year, kept only when they add up to that total, so the chart
 * never shows a breakdown the report does not support.
 */
export function extractExpenseBreakdown(pages: ReportPage[]): ExpenseBreakdown | null {
  for (const statement of readStatements(pages)) {
    if (statement.kind !== "income") continue;
    const totalIndex = statement.rows.findIndex(({ label }) => /^total\s+(?:operating\s+)?expenses$/i.test(label));
    if (totalIndex < 2) continue;

    const total = statement.rows[totalIndex];
    const tolerance = Math.max(1, Math.abs(total.values[0]) * 0.001);
    let sum = 0;
    for (let index = totalIndex - 1; index >= 0; index -= 1) {
      const row = statement.rows[index];
      if (/^total\b/i.test(row.label) || row.values[0] <= 0) break;
      sum += row.values[0];
      if (sum > total.values[0] + tolerance) break;
      if (Math.abs(sum - total.values[0]) <= tolerance && totalIndex - index >= 2) {
        return {
          label: total.label,
          period: statement.years[0],
          unit: statement.unit,
          page: statement.page,
          total: total.values[0],
          categories: statement.rows
            .slice(index, totalIndex)
            .map(({ label, values }) => ({ name: label, amount: values[0] })),
        };
      }
    }
  }
  return null;
}
