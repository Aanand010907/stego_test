"use client";

import React from "react";
import {
  Download,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Activity,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { ScanJob } from "../lib/types";
import { RiskGauge } from "./RiskGauge";
import { FourpartViewer } from "./FourpartViewer";
import { FindingsTable } from "./FindingsTable";
import { LayerExplorer } from "./LayerExplorer";
import { getPdfReportUrl, getJsonReportUrl } from "../lib/api";

interface ScanResultsViewProps {
  scan: ScanJob;
  onNewScan: () => void;
}

export function ScanResultsView({ scan, onNewScan }: ScanResultsViewProps) {
  const result = scan.result;
  const risk = result?.risk;
  const metadata = result?.metadata;

  if (!result || !risk) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <p className="text-slate-400">Scan details not available or still processing.</p>
        <button
          onClick={onNewScan}
          className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Return to Scan Studio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-slate-400">SCAN ID:</span>
            <span className="font-mono text-xs text-blue-400 font-bold">{scan.id}</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white tracking-tight">
            Inspection Verdict: {scan.filename}
          </h2>
        </div>

        {/* Action Buttons: Export PDF, JSON, New Scan */}
        <div className="flex items-center space-x-2.5">
          <a
            href={getPdfReportUrl(scan.id)}
            download
            className="flex items-center space-x-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>Export PDF Report</span>
          </a>

          <a
            href={getJsonReportUrl(scan.id)}
            download
            className="flex items-center space-x-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-all shadow-sm"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </a>

          <button
            onClick={onNewScan}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-md"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Audit</span>
          </button>
        </div>
      </div>

      {/* Hero Verdict & Metadata Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Risk Gauge Card */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Steganalysis Risk Verdict
          </h3>
          <RiskGauge score={risk.score} band={risk.band} />

          <div className="mt-4 w-full border-t border-slate-800/80 pt-3 text-center">
            <span className="text-[11px] text-slate-400 font-mono">
              Duration: {scan.duration_sec ? `${scan.duration_sec.toFixed(2)}s` : "-"} • 10 Stages
            </span>
          </div>
        </div>

        {/* Model Identification Card */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Model Identity & Integrity Baseline
          </h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs font-mono">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Architecture</span>
              <p className="mt-1 font-bold text-slate-200">{scan.model_arch || "SafeTensors"}</p>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase">File Size</span>
              <p className="mt-1 font-bold text-slate-200">
                {(metadata?.file_size_bytes || scan.file_size_bytes).toLocaleString()} bytes
              </p>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Parameters</span>
              <p className="mt-1 font-bold text-slate-200">
                {metadata?.parameter_count.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Tensors</span>
              <p className="mt-1 font-bold text-slate-200">{metadata?.tensor_count}</p>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 sm:col-span-2">
              <span className="text-[10px] text-slate-400 uppercase">SHA-256 Digest</span>
              <p className="mt-1 font-bold text-blue-400 truncate" title={metadata?.sha256}>
                {metadata?.sha256}
              </p>
            </div>
          </div>

          {/* Clinical Policy Guidance */}
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-300">
            <span className="font-semibold text-white">Precision Care Deployment Recommendation: </span>
            {risk.band === "LOW" && (
              <span className="text-emerald-300">
                Model demonstrates natural bit-plane distribution and passed few-shot metric validation. Approved for routine staging and verification.
              </span>
            )}
            {risk.band === "MEDIUM" && (
              <span className="text-amber-300">
                Mild statistical deviations detected in mantissa bits. Secondary manual audit of Grayscale-Fourpart Plane 3 recommended before clinical promotion.
              </span>
            )}
            {(risk.band === "HIGH" || risk.band === "CRITICAL") && (
              <span className="text-rose-300">
                Critical steganographic anomalies detected (LSB entropy {">"} 0.85 and abnormal regularity). Quarantine model immediately; do not deploy to diagnostic inference pipelines.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mathematical Risk Score Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Mathematical Risk Score Breakdown (Formula Tracing)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Zero-Hallucination Deterministic Formulation
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {risk.components.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-200">{c.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                    Weight: {(c.weight * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">OBSERVED VALUE</span>
                    <span className="text-sm font-bold text-white">
                      {c.measured_value !== undefined && c.measured_value !== null
                        ? `${c.measured_value.toFixed(4)} ${c.measured_unit}`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">SCORE CONTRIBUTION</span>
                    <span className="text-sm font-bold text-amber-400">
                      +{c.weighted_contribution.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400 border border-slate-800/80">
                  <span className="text-slate-400 block mb-0.5">Formula:</span>
                  <span className="text-slate-300 break-all">{c.formula}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grayscale-Fourpart Viewer */}
      <FourpartViewer
        imageUrl={scan.fourpart_image_url}
        shape={result.grayscale_fourpart_shape || undefined}
      />

      {/* Explainable Findings Table */}
      <FindingsTable findings={risk.findings} />

      {/* Layer-by-Layer Explorer */}
      <LayerExplorer layers={result.layers} />
    </div>
  );
}
