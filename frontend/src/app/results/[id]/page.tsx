"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, RefreshCw } from "lucide-react";
import { ProtectedRoute } from "../../../lib/auth";
import { AppNavbar } from "../../../components/AppNavbar";
import { ScanResultsView } from "../../../components/ScanResultsView";
import { ScanJob } from "../../../lib/types";
import { fetchScan, getPdfReportUrl } from "../../../lib/api";
import { TransitionLink, useRouteTransition } from "../../../components/RouteTransitionProvider";

export default function ResultsPage() {
  const params = useParams();
  const scanId = params?.id as string;
  const { navigateTo } = useRouteTransition();

  const [scan, setScan] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scanId) {
      loadScan(scanId);
    }
  }, [scanId]);

  const loadScan = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScan(id);
      setScan(data);
    } catch (err: any) {
      setError(err.message || "Failed to load scan results");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigateTo("/dashboard");
  };

  const handleStartNewScan = () => {
    navigateTo("/scan");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#10100D] text-bone flex flex-col font-sans">
        <AppNavbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#282722] pb-6 font-mono">
            <div className="space-y-1">
              <TransitionLink
                href="/dashboard"
                className="inline-flex items-center space-x-1.5 text-xs text-bone-dim hover:text-bone transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO DASHBOARD</span>
              </TransitionLink>
              <h1 className="text-2xl sm:text-3xl font-serif text-bone font-normal">
                Forensic Weight Inspection
              </h1>
            </div>

            {scan && (
              <div className="flex items-center space-x-3 text-xs">
                <TransitionLink
                  href={`/reports/${scan.id}`}
                  className="btn-invert inline-flex items-center space-x-2 px-4 py-2 uppercase"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit Dossier</span>
                </TransitionLink>

                <a
                  href={getPdfReportUrl(scan.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-invert-primary inline-flex items-center space-x-2 px-4 py-2 uppercase font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 font-mono text-xs text-bone-dim">
              <span className="animate-pulse">LOADING FORENSIC REPORT...</span>
            </div>
          ) : error || !scan ? (
            <div className="p-6 border border-red-800 bg-red-950/40 text-xs font-mono text-red-300 space-y-3">
              <div>{error || "Scan record not found."}</div>
              <button
                onClick={() => scanId && loadScan(scanId)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 border border-red-700 bg-red-900/60 hover:bg-red-800 text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <ScanResultsView
              scan={scan}
              onNewScan={handleStartNewScan}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
