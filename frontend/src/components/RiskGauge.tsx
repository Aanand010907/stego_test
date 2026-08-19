"use client";

import React from "react";

interface RiskGaugeProps {
  score: number;
  band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  size?: "sm" | "md" | "lg";
}

export function RiskGauge({ score, band, size = "md" }: RiskGaugeProps) {
  const getBandStyles = () => {
    switch (band) {
      case "LOW":
        return {
          textColor: "text-emerald-400",
          bgColor: "bg-emerald-950/60 border-emerald-800",
          strokeColor: "#10b981",
          label: "LOW RISK // VERIFIED CLEAN",
        };
      case "MEDIUM":
        return {
          textColor: "text-amber-400",
          bgColor: "bg-amber-950/60 border-amber-800",
          strokeColor: "#f59e0b",
          label: "MEDIUM RISK // ANOMALOUS",
        };
      case "HIGH":
        return {
          textColor: "text-orange-400",
          bgColor: "bg-orange-950/60 border-orange-800",
          strokeColor: "#f97316",
          label: "HIGH RISK // QUARANTINE",
        };
      case "CRITICAL":
        return {
          textColor: "text-rose-400",
          bgColor: "bg-rose-950/60 border-rose-800",
          strokeColor: "#ef4444",
          label: "CRITICAL RISK // STEGO DETECTED",
        };
    }
  };

  const styles = getBandStyles();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={styles.strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`font-mono text-3xl font-extrabold ${styles.textColor}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </div>

      <div
        className={`mt-2 inline-flex items-center rounded-md px-3 py-1 text-xs font-mono font-bold tracking-wide border ${styles.bgColor} ${styles.textColor}`}
      >
        {styles.label}
      </div>
    </div>
  );
}
