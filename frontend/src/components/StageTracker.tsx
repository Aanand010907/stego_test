"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from "lucide-react";
import { PipelineStage, StageInfo } from "../lib/types";

interface StageTrackerProps {
  currentStage: PipelineStage;
  progress: number;
  stages: StageInfo[];
  status: string;
}

export function StageTracker({ currentStage, progress, stages, status }: StageTrackerProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Pipeline Execution Pipeline (10 Stages)
          </h3>
          <p className="text-xs text-slate-400">
            Real-time execution across statistical, bit-level, and metric-space steganalysis.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-bold text-blue-400">{progress}%</span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-mono font-medium ${
              status === "COMPLETED"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : status === "FAILED"
                ? "bg-rose-950 text-rose-400 border border-rose-800"
                : "bg-blue-950 text-blue-400 border border-blue-800 animate-pulse"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((stage, idx) => {
          const isCurrent = stage.stage === currentStage && status === "PROCESSING";
          const isCompleted = stage.status === "COMPLETED";
          const isFailed = stage.status === "FAILED";

          let borderClass = "border-slate-800/80 bg-slate-900/40";
          let icon = <Circle className="h-4 w-4 text-slate-600" />;

          if (isCompleted) {
            borderClass = "border-emerald-900/50 bg-emerald-950/20";
            icon = <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
          } else if (isCurrent) {
            borderClass = "border-blue-500 bg-blue-950/30 animate-stage-pulse shadow-md shadow-blue-950/50";
            icon = <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />;
          } else if (isFailed) {
            borderClass = "border-rose-900/60 bg-rose-950/30";
            icon = <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
          }

          return (
            <div
              key={stage.stage}
              className={`flex flex-col justify-between rounded-lg border p-3 transition-all ${borderClass}`}
            >
              <div className="flex items-start space-x-2">
                {icon}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      STEP {idx + 1}
                    </span>
                    {stage.duration_ms !== undefined && stage.duration_ms !== null && (
                      <span className="flex items-center text-[10px] font-mono text-slate-400">
                        <Clock className="mr-0.5 h-2.5 w-2.5" />
                        {stage.duration_ms < 1000
                          ? `${stage.duration_ms.toFixed(0)}ms`
                          : `${(stage.duration_ms / 1000).toFixed(2)}s`}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-0.5 truncate text-xs font-medium text-slate-200" title={stage.name}>
                    {stage.name.replace(/^\d+\.\s*/, "")}
                  </h4>
                </div>
              </div>

              {stage.message && (
                <p className="mt-2 line-clamp-2 text-[10px] text-slate-400 font-mono">
                  {stage.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
