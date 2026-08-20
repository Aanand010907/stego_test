"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";
import { ProtectedRoute } from "../../../lib/auth";
import { AppNavbar } from "../../../components/AppNavbar";
import { ScanJob } from "../../../lib/types";
import { fetchScan, getPdfReportUrl } from "../../../lib/api";
import { TransitionLink } from "../../../components/RouteTransitionProvider";

export default function ReportPage() {
  const params = useParams();
  const scanId = params?.id as string;

  const [scan, setScan] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scanId) {
      loadScan(scanId);
    }
  }, [scanId]);

  const loadScan = async (id: string) => {
    setLoading(true);
    try {
      const data = await fetchScan(id);
      setScan(data);
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const risk = scan?.result?.risk;
  const meta = scan?.result?.metadata;

  const getRiskBadgeColor = (band?: string) => {
    switch (band) {
      case "LOW":
        return "text-emerald-400 border-emerald-800 bg-emerald-950/40";
      case "MEDIUM":
        return "text-amber-400 border-amber-800 bg-amber-950/40";
      case "HIGH":
        return "text-orange-400 border-orange-800 bg-orange-950/40";
      case "CRITICAL":
        return "text-red-400 border-red-800 bg-red-950/40";
      default:
        return "text-bone-dim border-[#282722] bg-[#141410]";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#10100D] text-bone flex flex-col font-sans">
        <AppNavbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-[#282722] pb-4 font-mono">
            <TransitionLink
              href={`/results/${scanId}`}
              className="inline-flex items-center space-x-1.5 text-xs text-bone-dim hover:text-bone transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO FORENSIC VIEW</span>
            </TransitionLink>

            {scan && (
              <a
                href={getPdfReportUrl(scan.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-invert-primary inline-flex items-center space-x-2 px-4 py-1.5 text-xs uppercase font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT PDF</span>
              </a>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-bone-dim animate-pulse">
              GENERATING AUDIT DOSSIER...
            </div>
          ) : !scan ? (
            <div className="p-6 border border-red-800 text-xs font-mono text-red-300">
              Scan not found.
            </div>
          ) : (
            /* Printable Formal Security Dossier */
            <div className="p-8 sm:p-12 border border-[#282722] bg-[#141410] space-y-8 font-sans">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-[#282722] pb-6">
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-dim block">
                    MODEL X-RAY // DEFENSIVE COMPLIANCE AUDIT
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif text-bone font-normal">
                    Model Weight Steganalysis Dossier
                  </h1>
                </div>
                <div className="text-right font-mono text-[10px] text-bone-dim space-y-1">
                  <div>REPORT ID: {scan.id.substring(0, 8)}</div>
                  <div>TIMESTAMP: {new Date(scan.created_at).toISOString()}</div>
                </div>
              </div>

              {/* Target Artifact Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-[#0E0E0B] border border-[#282722] font-mono text-xs">
                <div>
                  <span className="text-bone-dim block text-[10px] uppercase">Artifact Name</span>
                  <span className="text-bone font-semibold truncate block">{scan.filename}</span>
                </div>
                <div>
                  <span className="text-bone-dim block text-[10px] uppercase">Total Tensors</span>
                  <span className="text-bone font-semibold">{meta?.tensor_count || "N/A"}</span>
                </div>
                <div>
                  <span className="text-bone-dim block text-[10px] uppercase">Parameters</span>
                  <span className="text-bone font-semibold">
                    {meta?.parameter_count ? (meta.parameter_count / 1e6).toFixed(2) + "M" : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-bone-dim block text-[10px] uppercase">SHA-256 Digest</span>
                  <span className="text-bone-muted truncate block text-[10px]">
                    {meta?.sha256 ? meta.sha256.substring(0, 16) + "..." : "VERIFIED"}
                  </span>
                </div>
              </div>

              {/* Overall Executive Verdict Banner */}
              <div className={`p-6 border ${getRiskBadgeColor(risk?.band)} flex flex-col sm:flex-row sm:items-center justify-between gap-6`}>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest block opacity-80">
                    Executive Security Verdict
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl sm:text-3xl font-bold font-mono">
                      {risk?.band} RISK ({risk?.score?.toFixed(1)} / 100)
                    </span>
                  </div>
                  <p className="text-xs max-w-xl opacity-90 leading-relaxed font-sans pt-1">
                    {risk?.findings?.[0]?.recommended_action || (risk?.band === "LOW" ? "Model weight distributions are nominal. Cleared for standard deployment." : "Quarantine model from production. Further forensic analysis required.")}
                  </p>
                </div>

                <div className="p-4 bg-[#10100D]/80 border border-current text-center min-w-[140px] font-mono">
                  <span className="block text-[10px] uppercase opacity-75">Status</span>
                  <span className="text-sm font-bold uppercase">
                    {risk?.band === "LOW" ? "CLEARED" : "QUARANTINED"}
                  </span>
                </div>
              </div>

              {/* Component Anomaly Scores Table */}
              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-widest text-bone-dim font-bold">
                  Defensive Anomaly Component Breakdown
                </h3>
                <div className="overflow-x-auto border border-[#282722]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0E0E0B] text-bone-dim uppercase text-[10px] border-b border-[#282722]">
                      <tr>
                        <th className="px-4 py-3 font-normal">Indicator Vector</th>
                        <th className="px-4 py-3 font-normal">Component Score</th>
                        <th className="px-4 py-3 font-normal">Weight</th>
                        <th className="px-4 py-3 font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#282722] text-bone-muted">
                      {risk?.components?.map((c) => (
                        <tr key={c.name}>
                          <td className="px-4 py-3 font-semibold text-bone uppercase">{c.name.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3">{c.component_score.toFixed(1)} / 100</td>
                          <td className="px-4 py-3 text-bone-dim">{(c.weight * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10px] ${
                              c.component_score > 50 ? "bg-red-950 text-red-400 border border-red-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            }`}>
                              {c.component_score > 50 ? "ANOMALOUS" : "NOMINAL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
