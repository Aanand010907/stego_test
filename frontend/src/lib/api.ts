import {
  DashboardStats,
  DemoModelOption,
  ScanJob,
} from "./types";

const API_BASE = "";

export async function fetchHealth(): Promise<{
  status: string;
  detector_loaded: boolean;
  reference_paper: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard statistics");
  return res.json();
}

export async function fetchDemoModels(): Promise<{
  demo_models: DemoModelOption[];
  security_policy: {
    allowed_formats: string[];
    rejected_formats: string[];
    rejection_reason: string;
  };
}> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error("Failed to fetch demo models");
  return res.json();
}

export async function uploadModel(file: File): Promise<{
  scan_id: string;
  status: string;
  filename: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function runDemoScan(sampleId: string): Promise<{
  scan_id: string;
  status: string;
  filename: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/api/scan/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sample_id: sampleId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Demo scan failed");
  }

  return res.json();
}

export async function fetchScan(scanId: string): Promise<ScanJob> {
  const res = await fetch(`${API_BASE}/api/scan/${scanId}`);
  if (!res.ok) throw new Error(`Failed to fetch scan details for ${scanId}`);
  return res.json();
}

export function getPdfReportUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/report/pdf`;
}

export function getJsonReportUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/report/json`;
}

export function getFourpartImageUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/artifacts/fourpart.png`;
}
