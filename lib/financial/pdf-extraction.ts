import type { ReportCoverage, ReportPage } from "@/lib/financial/types";
import {
  calculateFinancialMetrics,
  extractVerifiedFinancialFacts,
} from "@/lib/financial/calculations";
import type { CalculatedFinancialMetric, VerifiedFinancialFact } from "@/lib/financial/types";
import {
  MAX_ANALYSIS_PAGES,
  MAX_ANALYSIS_TEXT_LENGTH,
  MAX_PAGE_TEXT_LENGTH,
} from "@/lib/financial/analysis-schema";

const MAX_PDF_PAGES_TO_SCAN = 200;
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

export async function extractFinancialReport(file: File): Promise<{
  pages: ReportPage[];
  coverage: ReportCoverage;
  reportedFacts: VerifiedFinancialFact[];
  calculatedMetrics: CalculatedFinancialMetric[];
}> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });
  const pages: ReportPage[] = [];
  let coverage: ReportCoverage = { pagesScanned: 0, isTruncated: false };
  try {
    const document = await loadingTask.promise;
    let characterCount = 0;
    const totalPages = document.numPages;
    const pagesToScan = Math.min(totalPages, MAX_PDF_PAGES_TO_SCAN);
    let pagesScanned = 0;

    try {
      for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
        pagesScanned = pageNumber;
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = collectPageText(content.items);
        const relevantText = selectRelevantText(pageText);
        page.cleanup();

        if (!relevantText) continue;

        const remaining = MAX_ANALYSIS_TEXT_LENGTH - characterCount;
        if (remaining <= 0 || pages.length >= MAX_ANALYSIS_PAGES) break;

        const text = relevantText.slice(0, Math.min(MAX_PAGE_TEXT_LENGTH, remaining));
        pages.push({ page: pageNumber, text });
        characterCount += text.length;
      }
    } finally {
      coverage = {
        pagesScanned,
        isTruncated:
          totalPages > pagesScanned ||
          pages.length >= MAX_ANALYSIS_PAGES ||
          characterCount >= MAX_ANALYSIS_TEXT_LENGTH,
      };
    }
  } finally {
    await loadingTask.destroy();
  }

  if (pages.length === 0) {
    throw new Error("No selectable report text was found. This PDF may be scanned or image-only.");
  }

  const reportedFacts = extractVerifiedFinancialFacts(pages);
  return {
    pages,
    coverage,
    reportedFacts,
    calculatedMetrics: calculateFinancialMetrics(reportedFacts),
  };
}
