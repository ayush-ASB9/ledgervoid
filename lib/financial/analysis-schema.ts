import { z } from "zod";

export const MAX_ANALYSIS_PAGES = 80;
export const MAX_PAGE_TEXT_LENGTH = 4000;
export const MAX_ANALYSIS_TEXT_LENGTH = 40_000;
export const MAX_ANALYSIS_REQUEST_BYTES = 64 * 1024;

const pageSchema = z.object({
  page: z.number().int().positive(),
  text: z.string().min(1).max(MAX_PAGE_TEXT_LENGTH),
});

export const analysisRequestSchema = z.object({
  pages: z.array(pageSchema).min(1).max(MAX_ANALYSIS_PAGES),
  coverage: z.object({
    pagesScanned: z.number().int().positive().max(500),
    isTruncated: z.boolean(),
  }),
}).strict().superRefine((request, context) => {
  const totalLength = request.pages.reduce((length, page) => length + page.text.length, 0);

  if (totalLength > MAX_ANALYSIS_TEXT_LENGTH) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The extracted report text is too large to analyze.",
      path: ["pages"],
    });
  }

  const pageNumbers = request.pages.map(({ page }) => page);
  if (new Set(pageNumbers).size !== pageNumbers.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report pages must have unique page numbers.",
      path: ["pages"],
    });
  }
});

const evidenceSchema = z.object({
  page: z.number().int().positive(),
  quote: z.string().min(8).max(500),
}).strict();

const findingSchema = z.object({
  title: z.string().min(1).max(120),
  explanation: z.string().min(1).max(600),
  classification: z.enum([
    "fact",
    "calculation",
    "interpretation",
    "hypothesis",
    "missing",
  ]),
  evidence: z.array(evidenceSchema).max(3),
}).strict().superRefine((finding, context) => {
  if (finding.classification !== "missing" && finding.evidence.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Findings must include report evidence or be marked as missing.",
      path: ["evidence"],
    });
  }
});

export const financialAnalysisSchema = z.object({
  executiveSummary: findingSchema,
  revenueTrends: z.array(findingSchema).max(5),
  profitability: z.array(findingSchema).max(5),
  keyDevelopments: z.array(findingSchema).max(5),
  risks: z.array(findingSchema).max(5),
  cashFlow: z.array(findingSchema).max(5),
  questions: z.array(z.object({
    question: z.string().min(1).max(240),
    evidence: z.array(evidenceSchema).max(2),
  }).strict()).max(5),
  limitations: z.array(z.string().min(1).max(300)).max(5),
}).strict();

const reportedFactSchema = z.object({
  metric: z.enum(["revenue", "expenses", "netProfit", "cashFlow"]),
  label: z.string().min(1).max(120),
  value: z.number().finite(),
  unit: z.string().min(1).max(30),
  period: z.number().int().nullable(),
  page: z.number().int().positive(),
  evidence: z.string().min(1).max(500),
}).strict();

const calculatedMetricSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.number().finite(),
  unit: z.literal("%"),
  period: z.string().min(1).max(30),
  evidence: z.array(z.object({
    page: z.number().int().positive(),
    quote: z.string().min(1).max(500),
  }).strict()).min(1).max(3),
}).strict();

export const analysisResponseSchema = z.object({
  analysis: financialAnalysisSchema,
  reportedFacts: z.array(reportedFactSchema),
  calculatedMetrics: z.array(calculatedMetricSchema),
  model: z.string().min(1).max(120),
}).strict();

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
