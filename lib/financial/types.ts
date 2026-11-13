export type FinancialMetric = {
  label: string;
  value: number | null;
  displayValue?: string;
  currency?: string;
  description: string;
};

export type FinancialPeriod = {
  period: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
  revenueChange?: number;
  profitChange?: number;
};

export type ExpenseCategory = {
  name: string;
  amount: number;
};

/** Expense lines from an income statement that add up to its reported total. */
export type ExpenseBreakdown = {
  label: string;
  period: number;
  unit: string;
  page: number;
  total: number;
  categories: ExpenseCategory[];
};

export type ReportPage = {
  page: number;
  text: string;
};

export type ReportCoverage = {
  pagesScanned: number;
  isTruncated: boolean;
};

export type VerifiedFinancialFact = {
  metric: "revenue" | "expenses" | "netProfit" | "cashFlow";
  label: string;
  value: number;
  unit: string;
  period: number | null;
  page: number;
  evidence: string;
};

export type CalculatedFinancialMetric = {
  label: string;
  value: number;
  unit: "%";
  period: string;
  evidence: { page: number; quote: string }[];
};

export type AnalysisEvidence = {
  page: number;
  quote: string;
};

export type AnalysisFinding = {
  title: string;
  explanation: string;
  classification: "fact" | "calculation" | "interpretation" | "hypothesis" | "missing";
  evidence: AnalysisEvidence[];
};

export type AnalystQuestion = {
  question: string;
  evidence: AnalysisEvidence[];
};

export type FinancialAnalysis = {
  executiveSummary: AnalysisFinding;
  revenueTrends: AnalysisFinding[];
  profitability: AnalysisFinding[];
  keyDevelopments: AnalysisFinding[];
  risks: AnalysisFinding[];
  cashFlow: AnalysisFinding[];
  questions: AnalystQuestion[];
  limitations: string[];
};
