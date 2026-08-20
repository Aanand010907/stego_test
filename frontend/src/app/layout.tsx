import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { AsciiMaskTransition } from "../components/AsciiMaskTransition";

export const metadata: Metadata = {
  title: "Model X-Ray // Brutalist ASCII Steganalysis SPA",
  description:
    "Defensive AI model steganalysis, zero-trust neural weight integrity auditing, and supply chain verification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#0A0A0A] font-sans">
        <AuthProvider>
          <AsciiMaskTransition>{children}</AsciiMaskTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
