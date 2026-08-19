"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Search, ShieldAlert, Sparkles, Filter } from "lucide-react";
import { Finding } from "../lib/types";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterScope, setFilterScope] = useState<string>("ALL");

  const scopes = Array.from(new Set(findings.map((f) => f.scope)));

  const filtered = findings.filter((f) => {
    const matchesSearch =
      f.indicator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.interpretation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScope = filterScope === "ALL" || f.scope === filterScope;
    return matchesSearch && matchesScope;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Explainable Steganalysis Findings ({findings.length})
          </h3>
          <p className="text-xs text-slate-400">
            Traced indicators, observed statistical values, reference thresholds, and clinical deployment recommendations.
          </p>
        </div>

        {/* Filter / Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-44 rounded-md border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Scopes</option>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400">
            <tr>
              <th className="px-4 py-3">Scope / Tensor</th>
              <th className="px-4 py-3">Indicator</th>
              <th className="px-4 py-3">Observed</th>
              <th className="px-4 py-3">Clean Baseline</th>
              <th className="px-4 py-3">Interpretation & Guidance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No matching findings found.
                </td>
              </tr>
            ) : (
              filtered.map((f, idx) => {
                const isWarning =
                  f.reference_range &&
                  f.observed_value !== undefined &&
                  (f.observed_value < f.reference_range[0] ||
                    f.observed_value > f.reference_range[1]);

                return (
                  <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">
                      {f.scope}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-400">
                      {f.indicator}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {f.observed_value !== undefined && f.observed_value !== null ? (
                        <span
                          className={`font-bold ${
                            isWarning ? "text-amber-400" : "text-slate-200"
                          }`}
                        >
                          {f.observed_value.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {f.reference_range
                        ? `[${f.reference_range[0].toFixed(2)}, ${f.reference_range[1].toFixed(2)}]`
                        : "Heuristic"}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <p className="text-slate-300 leading-relaxed">{f.interpretation}</p>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-400">Recommended Action:</span>
                        <span className="text-slate-300 font-mono">{f.recommended_action}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
