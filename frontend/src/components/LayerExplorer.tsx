"use client";

import React, { useState } from "react";
import { Database, ChevronDown, ChevronRight, Activity, Binary } from "lucide-react";
import { LayerAnalysis } from "../lib/types";

interface LayerExplorerProps {
  layers: LayerAnalysis[];
}

export function LayerExplorer({ layers }: LayerExplorerProps) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(layers[0]?.name || null);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Per-Layer Steganalysis & Statistics ({layers.length} Layers)
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Total Parameters: {layers.reduce((acc, l) => acc + l.parameter_count, 0).toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        {layers.map((layer) => {
          const isExpanded = expandedLayer === layer.name;
          const isFloat32 = layer.dtype === "float32";
          const lsbEntropy = layer.bit_level?.lsb_entropy;
          const isSuspiciousLsb = lsbEntropy !== undefined && lsbEntropy > 0.85;

          return (
            <div
              key={layer.name}
              className={`rounded-lg border transition-all ${
                isSuspiciousLsb
                  ? "border-rose-900/50 bg-rose-950/10"
                  : "border-slate-800 bg-slate-900/30"
              }`}
            >
              {/* Layer Summary Row */}
              <div
                onClick={() => setExpandedLayer(isExpanded ? null : layer.name)}
                className="flex cursor-pointer items-center justify-between p-3 hover:bg-slate-800/30"
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {layer.name}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {layer.dtype}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    [{layer.shape.join(", ")}]
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  {lsbEntropy !== undefined && (
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      <span className="text-slate-400 text-[10px]">LSB ENTROPY:</span>
                      <span
                        className={`font-bold ${
                          isSuspiciousLsb ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {lsbEntropy.toFixed(3)}
                      </span>
                    </div>
                  )}
                  <span className="font-mono text-xs text-slate-400">
                    {layer.parameter_count.toLocaleString()} params
                  </span>
                </div>
              </div>

              {/* Layer Detailed Metrics */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/60 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Statistical Metrics */}
                    {layer.statistics && (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                        <div className="mb-2 flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                          <Activity className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Statistical Moments</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-slate-400">Mean: </span>
                            <span className="text-slate-200">{layer.statistics.mean.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Std: </span>
                            <span className="text-slate-200">{layer.statistics.std.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Min / Max: </span>
                            <span className="text-slate-200">
                              {layer.statistics.min.toFixed(3)} / {layer.statistics.max.toFixed(3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Shannon Entropy: </span>
                            <span className="text-slate-200">{layer.statistics.entropy.toFixed(3)} bits</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Skewness / Kurt: </span>
                            <span className="text-slate-200">
                              {layer.statistics.skewness.toFixed(3)} / {layer.statistics.kurtosis.toFixed(3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Zero Ratio: </span>
                            <span className="text-slate-200">
                              {(layer.statistics.zero_ratio * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bit-Level Metrics */}
                    {layer.bit_level && (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                        <div className="mb-2 flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                          <Binary className="h-3.5 w-3.5 text-blue-400" />
                          <span>Bit-Level Steganalysis</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-slate-400">LSB Entropy: </span>
                            <span
                              className={`font-bold ${
                                isSuspiciousLsb ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {layer.bit_level.lsb_entropy.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">LSB 1s Ratio: </span>
                            <span className="text-slate-200">
                              {(layer.bit_level.lsb_ones_ratio * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Local Regularity: </span>
                            <span className="text-slate-200">
                              {layer.bit_level.local_regularity.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Freq Deviation: </span>
                            <span className="text-slate-200">
                              {layer.bit_level.mean_bit_frequency_deviation.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
