"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Cpu, Activity, Terminal } from "lucide-react";

interface NavbarProps {
  activeTab: "dashboard" | "scan" | "results";
  setActiveTab: (tab: "dashboard" | "scan" | "results") => void;
  systemStatus: {
    healthy: boolean;
    detectorLoaded: boolean;
  };
}

export function Navbar({ activeTab, setActiveTab, systemStatus }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-bold tracking-wider text-white">
                MODEL<span className="text-blue-500">X-RAY</span>
              </span>
              <span className="rounded bg-blue-950 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-400 border border-blue-800">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Defensive AI-Model Steganalysis Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "scan"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Scan Studio</span>
          </button>
          {activeTab === "results" && (
            <button
              onClick={() => setActiveTab("results")}
              className="flex items-center space-x-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Inspection Report</span>
            </button>
          )}
        </nav>

        {/* Security Engine Status */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                systemStatus.healthy ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="font-mono text-slate-300">
              {systemStatus.detectorLoaded ? "DETECTOR: ACTIVE" : "DETECTOR: INIT"}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400">
            <span className="font-mono text-[10px] text-slate-500">FORMAT:</span>
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-800">
              SafeTensors
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
