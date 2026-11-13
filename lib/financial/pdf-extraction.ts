import type { ExpenseBreakdown, ReportCoverage, ReportPage } from "@/lib/financial/types";
import {
  calculateFinancialMetrics,
  extractReportedFacts,
} from "@/lib/financial/calculations";
import { extractExpenseBreakdown, isStatementPage } from "@/lib/financial/statements";
import type { CalculatedFinancialMetric, VerifiedFinancialFact } from "@/lib/financial/types";
import {
  MAX_ANALYSIS_PAGES,
  MAX_ANALYSIS_TEXT_LENGTH,
  MAX_PAGE_TEXT_LENGTH,
} from "@/lib/financial/analysis-schema";

// Annual reports often put the financial statements past page 250.
const MAX_PDF_PAGES_TO_SCAN = 500;
const relevantLine =
  /\b(revenue|income|profit|loss|cash flow|cash generated|operating activities|expense|debt|borrow|liabilit|asset|margin|dividend|risk|contingenc|audit|going concern|impairment|segment|turnover|ebitda|tax)\b/i;

function collectPageText(items: unknown[]): string {
  const lines = new Map<number, { x: number; text: string }[]>();

  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) {
      continue;
    }

    const text = item.str;
    const transform = item.transform;
    if (
      typeof text !== "string" ||
      !Array.isArray(transform) ||
      typeof transform[4] !== "number" ||
      typeof transform[5] !== "number"
    ) {
      continue;
    }

    const y = Math.round(transform[5] / 2) * 2;
    const line = lines.get(y) ?? [];
    line.push({ x: transform[4], text });
    lines.set(y, line);
  }

  return [...lines.entries()]
    .sort(([left], [right]) => right - left)
    .map(([, line]) => line
      .sort((left, right) => left.x - right.x)
      .map(({ text }) => text.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    .join("\n");
}

function selectRelevantText(text: string): string {
  const lines = text.split(/\r?\n/);
  const selected = new Set<number>();

  lines.forEach((line, index) => {
    if (!relevantLine.test(line)) return;
    selected.add(index);
    if (index > 0 && lines[index - 1].length < 180) selected.add(index - 1);
    if (index + 1 < lines.length && lines[index + 1].length < 180) selected.add(index + 1);
  });

  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .join("\n");
}

/**
 * Picks the pages sent for analysis within the request limits: the financial
 * statements first, because the figures come from them, then the other pages in order.
 */
function selectAnalysisPages(statementPages: ReportPage[], otherPages: ReportPage[]) {
  const selected: ReportPage[] = [];
  let characterCount = 0;
  let isTruncated = false;

  for (const candidate of [...statementPages, ...otherPages]) {
    const remaining = MAX_ANALYSIS_TEXT_LENGTH - characterCount;
    if (remaining <= 0 || selected.length >= MAX_ANALYSIS_PAGES) {
      isTruncated = true;
      break;
    }
    const text = candidate.text.slice(0, remaining);
    if (text.length < candidate.text.length) isTruncated = true;
    selected.push({ page: candidate.page, text });
    characterCount += text.length;
  }

  return { pages: selected.sort((left, right) => left.page - right.page), isTruncated };
}

export async function extractFinancialReport(file: File): Promise<{
  pages: ReportPage[];
  coverage: ReportCoverage;
  reportedFacts: VerifiedFinancialFact[];
  calculatedMetrics: CalculatedFinancialMetric[];
  expenseBreakdown: ExpenseBreakdown | null;
}> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });
  // Statement pages keep all their lines, because every row is a figure. Other pages
  // keep only lines about financial topics.
  const statementPages: ReportPage[] = [];
  const otherPages: ReportPage[] = [];
  let totalPages = 0;
  let pagesScanned = 0;
  try {
    const document = await loadingTask.promise;
    totalPages = document.numPages;
    const pagesToScan = Math.min(totalPages, MAX_PDF_PAGES_TO_SCAN);

    for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
      pagesScanned = pageNumber;
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = collectPageText(content.items);
      page.cleanup();

      if (isStatementPage(pageText)) {
        statementPages.push({ page: pageNumber, text: pageText.slice(0, MAX_PAGE_TEXT_LENGTH) });
        continue;
      }
      const relevantText = selectRelevantText(pageText);
      if (relevantText) otherPages.push({ page: pageNumber, text: relevantText.slice(0, MAX_PAGE_TEXT_LENGTH) });
    }
  } finally {
    await loadingTask.destroy();
  }

  if (statementPages.length === 0 && otherPages.length === 0) {
    throw new Error("No selectable report text was found. This PDF may be scanned or image-only.");
  }

  const selection = selectAnalysisPages(statementPages, otherPages);
  const reportedFacts = extractReportedFacts([...statementPages, ...otherPages].sort((a, b) => a.page - b.page));
  return {
    pages: selection.pages,
    coverage: {
      pagesScanned,
      isTruncated: selection.isTruncated || totalPages > pagesScanned,
    },
    reportedFacts,
    calculatedMetrics: calculateFinancialMetrics(reportedFacts),
    expenseBreakdown: extractExpenseBreakdown(statementPages),
  };
}
