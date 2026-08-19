"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { DashboardView } from "../components/DashboardView";
import { ScanStudio } from "../components/ScanStudio";
import { StageTracker } from "../components/StageTracker";
import { ScanResultsView } from "../components/ScanResultsView";
import {
  DashboardStats,
  DemoModelOption,
  PipelineStage,
  ScanJob,
} from "../lib/types";
import {
  fetchDemoModels,
  fetchHealth,
  fetchScan,
  fetchStats,
  runDemoScan,
  uploadModel,
} from "../lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "scan" | "results">("dashboard");
  const [systemStatus, setSystemStatus] = useState({ healthy: true, detectorLoaded: true });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [demoModels, setDemoModels] = useState<DemoModelOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Active scan tracking
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<ScanJob | null>(null);

  // Initial data loading
  useEffect(() => {
    loadHealthAndStats();
    loadDemoModels();
  }, []);

  const loadHealthAndStats = async () => {
    try {
      const health = await fetchHealth();
      setSystemStatus({
        healthy: health.status === "healthy",
        detectorLoaded: health.detector_loaded,
      });
      const st = await fetchStats();
      setStats(st);
    } catch (err) {
      console.error("Health/Stats fetch error:", err);
    }
  };

  const loadDemoModels = async () => {
    try {
      const data = await fetchDemoModels();
      setDemoModels(data.demo_models);
    } catch (err) {
      console.error("Demo models fetch error:", err);
    }
  };

  // Poll active scan while PROCESSING
  useEffect(() => {
    if (!currentScanId) return;

    let intervalId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const scan = await fetchScan(currentScanId);
        setActiveScan(scan);

        if (scan.status === "COMPLETED" || scan.status === "FAILED") {
          clearInterval(intervalId);
          setLoading(false);
          // Refresh stats
          fetchStats().then(setStats).catch(() => {});
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    poll();
    intervalId = setInterval(poll, 600);

    return () => clearInterval(intervalId);
  }, [currentScanId]);

  const handleStartUpload = async (file: File) => {
    setLoading(true);
    try {
      const res = await uploadModel(file);
      setCurrentScanId(res.scan_id);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleStartDemo = async (sampleId: string) => {
    setLoading(true);
    try {
      const res = await runDemoScan(sampleId);
      setCurrentScanId(res.scan_id);
    } catch (err: any) {
      alert(`Demo scan error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSelectRecentScan = async (scanId: string) => {
    setCurrentScanId(scanId);
    setActiveTab("results");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "results") {
            setCurrentScanId(null);
            setActiveScan(null);
          }
        }}
        systemStatus={systemStatus}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* If a scan is currently running in Scan Studio */}
        {activeTab === "scan" && activeScan && activeScan.status === "PROCESSING" && (
          <div className="space-y-6">
            <StageTracker
              currentStage={activeScan.current_stage}
              progress={activeScan.progress}
              stages={activeScan.stages}
              status={activeScan.status}
            />
          </div>
        )}

        {/* If scan is finished and we are in scan tab, show stage tracker + result button */}
        {activeTab === "scan" && activeScan && activeScan.status === "COMPLETED" && (
          <div className="space-y-6">
            <StageTracker
              currentStage={activeScan.current_stage}
              progress={activeScan.progress}
              stages={activeScan.stages}
              status={activeScan.status}
            />
            <ScanResultsView
              scan={activeScan}
              onNewScan={() => {
                setCurrentScanId(null);
                setActiveScan(null);
              }}
            />
          </div>
        )}

        {/* Scan Studio Idle Mode */}
        {activeTab === "scan" && (!activeScan || activeScan.status === "FAILED") && (
          <ScanStudio
            demoModels={demoModels}
            onUpload={handleStartUpload}
            onRunDemo={handleStartDemo}
            loading={loading}
          />
        )}

        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            loading={false}
            onSelectScan={handleSelectRecentScan}
            onStartNewScan={() => {
              setCurrentScanId(null);
              setActiveScan(null);
              setActiveTab("scan");
            }}
          />
        )}

        {/* Results View (from recent list click) */}
        {activeTab === "results" && activeScan && (
          <ScanResultsView
            scan={activeScan}
            onNewScan={() => {
              setCurrentScanId(null);
              setActiveScan(null);
              setActiveTab("scan");
            }}
          />
        )}
      </main>

      {/* Enterprise Security Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080C14] py-4 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Model X-Ray • GE HealthCare Precision Care Challenge 2026</span>
          <span className="font-mono text-[11px] text-slate-400">
            Gilkarov & Dubin (arXiv:2409.19310) Steganalysis Architecture
          </span>
        </div>
      </footer>
    </div>
  );
}
