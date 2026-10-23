"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from "react";
import { AlertCircle, Check, FileText, FolderOpen, Upload, X } from "lucide-react";
import { extractFinancialReport } from "@/lib/financial/pdf-extraction";
import type {
  CalculatedFinancialMetric,
  ReportCoverage,
  ReportPage,
  VerifiedFinancialFact,
} from "@/lib/financial/types";
import { formatFileSize } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

type ReportUploadProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onReportReady: (report: {
    name: string;
    pages: ReportPage[];
    coverage: ReportCoverage;
    reportedFacts: VerifiedFinancialFact[];
    calculatedMetrics: CalculatedFinancialMetric[];
  } | null) => void;
};

export function ReportUpload({ fileInputRef, onReportReady }: ReportUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionId = useRef(0);

  async function acceptFile(file: File | undefined) {
    if (!file) return;

    const currentExtractionId = ++extractionId.current;
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") &&
      (!file.type || file.type === "application/pdf");

    if (!isPdf) {
      setError("Choose a PDF file to continue.");
      setSelectedFile(null);
      setIsExtracting(false);
      onReportReady(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("This PDF is larger than 25 MB. Choose a smaller file.");
      setSelectedFile(null);
      setIsExtracting(false);
      onReportReady(null);
      return;
    }

    setError(null);
    onReportReady(null);
    setSelectedFile(file);
    setIsExtracting(true);

    try {
      const report = await extractFinancialReport(file);
      if (currentExtractionId === extractionId.current) {
        onReportReady({ name: file.name, ...report });
      }
    } catch (extractionError) {
      if (currentExtractionId === extractionId.current) {
        setSelectedFile(null);
        onReportReady(null);
        setError(
          extractionError instanceof Error &&
          extractionError.message.startsWith("No selectable report text")
            ? "No usable financial data was found in this report."
            : "This report could not be processed. Try another PDF.",
        );
      }
    } finally {
      if (currentExtractionId === extractionId.current) setIsExtracting(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  function clearFile() {
    extractionId.current += 1;
    setSelectedFile(null);
    setError(null);
    setIsExtracting(false);
    onReportReady(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section aria-labelledby="upload-heading" className="upload-card" id="reports">
      <div className="section-heading upload-heading">
        <div>
          <span className="section-kicker">GET STARTED</span>
          <h2 id="upload-heading">Your reports, understood.</h2>
          <p>Insights grounded in the company’s own disclosures.</p>
        </div>
        <div aria-hidden="true" className="upload-orbit">
          <div className="orbit-ring orbit-ring-outer" />
          <div className="orbit-ring orbit-ring-inner" />
          <div className="orbit-core"><FileText size={18} /></div>
          <span className="orbit-dot" />
        </div>
      </div>

      <div
        className={`dropzone${isDragging ? " is-dragging" : ""}${error ? " has-error" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setIsDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept=".pdf,application/pdf"
          aria-label="Choose an annual report PDF"
          className="visually-hidden"
          onChange={handleInputChange}
          ref={fileInputRef}
          type="file"
        />
        {selectedFile ? (
          <div className="file-selected">
            <span className="file-icon"><FileText size={19} /></span>
            <div className="file-copy">
              <strong>{selectedFile.name}</strong>
              <span>{formatFileSize(selectedFile.size)} <span className="file-separator">·</span> PDF received</span>
            </div>
            <span className="file-ready">
              {isExtracting ? "Processing report…" : <><Check size={13} /> Ready</>}
            </span>
            <button
              aria-label="Remove selected report"
              className="icon-button remove-file"
              onClick={clearFile}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="dropzone-prompt">
            <div aria-hidden="true" className="upload-icon"><Upload size={17} /></div>
            <div className="dropzone-copy">
              <strong>Drop your annual report here</strong>
              <span>PDF only <span className="file-separator">·</span> Up to 25 MB</span>
            </div>
            <span className="dropzone-or">or</span>
            <button
              className="button button-secondary browse-button"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <FolderOpen size={14} />
              Browse files
            </button>
          </div>
        )}
      </div>

      {(error || isExtracting || selectedFile) && (
        <div className={`upload-feedback${error ? " is-error" : ""}`}>
          {error ? (
            <>
              <AlertCircle aria-hidden="true" size={13} />
              <span role="alert">{error}</span>
            </>
          ) : isExtracting ? (
            <>
              <span className="privacy-indicator" />
              <span>Processing report details…</span>
            </>
          ) : (
            <>
              <AlertCircle aria-hidden="true" size={13} />
              <span>Report ready. Analysis starts when you choose to continue.</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
