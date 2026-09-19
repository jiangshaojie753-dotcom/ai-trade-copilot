import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Atlas · AI B2B Sales Copilot",
  description: "Evidence-first customer discovery and sales intelligence for export teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
