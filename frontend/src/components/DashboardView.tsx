"use client";

import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Database,
} from "lucide-react";
import { DashboardStats } from "../lib/types";

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onSelectScan: (scanId: string) => void;
  onStartNewScan: () => void;
}

export function DashboardView({
  stats,
  loading,
  onSelectScan,
  onStartNewScan,
}: DashboardViewProps) {
  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="font-mono text-xs">Loading Security Metrics...</span>
        </div>
      </div>
    );
  }

  const riskDist = stats.risk_distribution || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const total = stats.total_scans || 0;

  return (
    <div className="space-y-6">
      {/* Hero / Callout banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-[#0B0F19] via-slate-900 to-[#0B0F19] p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded bg-blue-900/60 px-2 py-0.5 font-mono text-[10px] text-blue-400 border border-blue-700">
                PRECISION CARE 2026
              </span>
              <span className="text-xs text-slate-400">
                Gilkarov & Dubin arXiv:2409.19310 Steganalysis Core
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-white tracking-tight sm:text-2xl">
              Defensive AI Model Steganalysis & Integrity Console
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300">
              Audit PyTorch/SafeTensors checkpoints for hidden steganographic payloads,
              least-significant-bit perturbations, and supply-chain tampering before clinical deployment.
            </p>
          </div>

          <button
            onClick={onStartNewScan}
            className="flex items-center space-x-2 self-start md:self-auto rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
          >
            <span>Scan AI Model</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Scans */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Scans</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-white">{total}</span>
            <span className="text-xs text-slate-400">models audited</span>
          </div>
        </div>

        {/* Clean Models */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Clean Models</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-emerald-400">
              {stats.clean_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({total > 0 ? ((stats.clean_count / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        {/* Suspicious Models */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Stego / Anomalies</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-rose-400">
              {stats.suspicious_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({total > 0 ? ((stats.suspicious_count / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        {/* Avg Scan Duration */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-cyan-400">
              {stats.average_duration_sec.toFixed(2)}s
            </span>
            <span className="text-xs text-slate-400">per 10-stage run</span>
          </div>
        </div>
      </div>

      {/* Risk Distribution & Recent Scans */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Risk Distribution Bar */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">
            Risk Band Distribution
          </h3>
          <div className="space-y-3">
            {[
              { band: "LOW", count: riskDist.LOW, color: "bg-emerald-500", text: "text-emerald-400" },
              { band: "MEDIUM", count: riskDist.MEDIUM, color: "bg-amber-500", text: "text-amber-400" },
              { band: "HIGH", count: riskDist.HIGH, color: "bg-orange-500", text: "text-orange-400" },
              { band: "CRITICAL", count: riskDist.CRITICAL, color: "bg-rose-500", text: "text-rose-400" },
            ].map((item) => (
              <div key={item.band} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={item.text}>{item.band} RISK</span>
                  <span className="text-slate-300 font-bold">{item.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full ${item.color}`}
                    style={{
                      width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Defense Policy: </span>
            Models scoring in HIGH or CRITICAL bands should be quarantined from precision healthcare pipelines.
          </div>
        </div>

        {/* Recent Scans Table */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#0B0F19] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Recent Model Audits
            </h3>
            <span className="text-xs text-slate-400">Showing last 10 audits</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Model Target</th>
                  <th className="px-4 py-2.5">Architecture</th>
                  <th className="px-4 py-2.5">Risk Score</th>
                  <th className="px-4 py-2.5">Verdict Band</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {stats.recent_scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No scans executed yet. Click "Scan AI Model" to begin.
                    </td>
                  </tr>
                ) : (
                  stats.recent_scans.map((s) => {
                    const bandColors: Record<string, string> = {
                      LOW: "text-emerald-400 bg-emerald-950 border-emerald-800",
                      MEDIUM: "text-amber-400 bg-amber-950 border-amber-800",
                      HIGH: "text-orange-400 bg-orange-950 border-orange-800",
                      CRITICAL: "text-rose-400 bg-rose-950 border-rose-800",
                    };

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                        onClick={() => onSelectScan(s.id)}
                      >
                        <td className="px-4 py-2.5 font-mono font-medium text-slate-200">
                          {s.filename}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {s.model_arch || "SafeTensors"}
                        </td>
                        <td className="px-4 py-2.5 font-mono">
                          {s.risk_score !== undefined && s.risk_score !== null ? (
                            <span className="font-bold text-slate-200">
                              {s.risk_score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {s.risk_band ? (
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold border ${
                                bandColors[s.risk_band] || "text-slate-300"
                              }`}
                            >
                              {s.risk_band}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px]">
                              {s.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {s.duration_sec ? `${s.duration_sec.toFixed(2)}s` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectScan(s.id);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-xs font-mono font-semibold"
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
