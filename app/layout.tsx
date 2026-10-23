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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
