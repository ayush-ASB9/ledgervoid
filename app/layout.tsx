import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LedgerVoid — Financial intelligence",
  description:
    "A clear, considered workspace for understanding company financials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions and app shells (such as Amp's) add attributes to <html>
    // before React hydrates. This ignores those attribute differences on <html> only.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
