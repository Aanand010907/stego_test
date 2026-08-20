"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../lib/auth";
import { AppNavbar } from "../../components/AppNavbar";
import { ScanStudio } from "../../components/ScanStudio";
import { StageTracker } from "../../components/StageTracker";
import { DemoModelOption, ScanJob } from "../../lib/types";
import { fetchDemoModels, fetchScan, runDemoScan, uploadModel } from "../../lib/api";
import { useRouteTransition } from "../../components/RouteTransitionProvider";

export default function ScanPage() {
  const { navigateTo } = useRouteTransition();
  const [demoModels, setDemoModels] = useState<DemoModelOption[]>([]);
  const [activeScan, setActiveScan] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDemos();
  }, []);

  const loadDemos = async () => {
    try {
      const data = await fetchDemoModels();
      setDemoModels(data.demo_models);
    } catch (err) {
      console.error("Demo models error:", err);
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const res = await uploadModel(file);
      pollScan(res.scan_id);
    } catch (err: any) {
      setError(err.message || "Failed to upload model");
      setLoading(false);
    }
  };

  const handleRunDemo = async (sampleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDemoScan(sampleId);
      pollScan(res.scan_id);
    } catch (err: any) {
      setError(err.message || "Failed to run demo scan");
      setLoading(false);
    }
  };

  const pollScan = (scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const updated = await fetchScan(scanId);
        setActiveScan(updated);
        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          clearInterval(interval);
          setLoading(false);
          if (updated.status === "COMPLETED") {
            setTimeout(() => {
              navigateTo(`/results/${scanId}`);
            }, 800);
          }
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#10100D] text-bone flex flex-col font-sans">
        <AppNavbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-dim block">
                SAFETENSORS ANALYSIS STUDIO
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif text-bone font-normal mt-1">
                Model Weight Steganalysis
              </h1>
            </div>

            {error && (
              <div className="p-4 border border-red-800 bg-red-950/40 text-xs font-mono text-red-300">
                {error}
              </div>
            )}

            {activeScan && activeScan.status !== "COMPLETED" ? (
              <div className="space-y-6">
                <div className="p-6 border border-[#282722] bg-[#141410] space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-bone font-semibold">{activeScan.filename}</span>
                    <span className="text-bone-dim">STATUS: {activeScan.status}</span>
                  </div>
                  <StageTracker
                    stages={activeScan.stages}
                    currentStage={activeScan.current_stage}
                    progress={activeScan.progress || 0}
                    status={activeScan.status}
                  />
                </div>
              </div>
            ) : (
              <ScanStudio
                demoModels={demoModels}
                onUpload={handleUpload}
                onRunDemo={handleRunDemo}
                loading={loading}
              />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
