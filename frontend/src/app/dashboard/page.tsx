"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../lib/auth";
import { AppNavbar } from "../../components/AppNavbar";
import { DashboardView } from "../../components/DashboardView";
import { DashboardStats, ScanJob } from "../../lib/types";
import { fetchHealth, fetchStats } from "../../lib/api";
import { useRouteTransition } from "../../components/RouteTransitionProvider";

export default function DashboardPage() {
  const { navigateTo } = useRouteTransition();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemStatus, setSystemStatus] = useState({ healthy: true, detectorLoaded: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const health = await fetchHealth();
      setSystemStatus({
        healthy: health.status === "healthy",
        detectorLoaded: health.detector_loaded,
      });
      const st = await fetchStats();
      setStats(st);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = () => {
    navigateTo("/scan");
  };

  const handleSelectScan = (scanId: string) => {
    navigateTo(`/results/${scanId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#10100D] text-bone flex flex-col font-sans">
        <AppNavbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardView
            stats={stats}
            loading={loading}
            onStartNewScan={handleStartScan}
            onSelectScan={handleSelectScan}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
