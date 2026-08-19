import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model X-Ray // Defensive Steganalysis Security Platform",
  description:
    "AI Model Steganography Detection and Weight Integrity Verification for Clinical and Precision Healthcare AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080C14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
