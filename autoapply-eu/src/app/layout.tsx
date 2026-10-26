import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AutoApply EU", description: "Autonomous, truthful job applications across Germany and the Netherlands" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
