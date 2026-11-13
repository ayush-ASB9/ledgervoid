/** Indian digit grouping (1,62,990) for rupee amounts, international otherwise. */
export function numberLocale(unit: string | null | undefined): string {
  return unit?.startsWith("INR") ? "en-IN" : "en-US";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
