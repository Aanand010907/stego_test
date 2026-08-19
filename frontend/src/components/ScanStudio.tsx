"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Play,
  Layers,
  Info,
  ShieldX,
  FileCheck,
} from "lucide-react";
import { DemoModelOption } from "../lib/types";

interface ScanStudioProps {
  demoModels: DemoModelOption[];
  onUpload: (file: File) => void;
  onRunDemo: (sampleId: string) => void;
  loading: boolean;
}

export function ScanStudio({
  demoModels,
  onUpload,
  onRunDemo,
  loading,
}: ScanStudioProps) {
  const [activeMode, setActiveMode] = useState<"demo" | "upload">("demo");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setFormatError(null);
    const name = file.name.toLowerCase();

    if (name.endsWith(".pt") || name.endsWith(".pth") || name.endsWith(".bin") || name.endsWith(".pkl")) {
      setFormatError(
        `Security Policy Alert: PyTorch pickle file (${file.name}) rejected. Pickle archives allow arbitrary code execution during deserialization. Only .safetensors models are accepted.`
      );
      setSelectedFile(null);
      return;
    }

    if (!name.endsWith(".safetensors")) {
      setFormatError("Unsupported file type. Please upload a .safetensors model file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMode("demo")}
          className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeMode === "demo"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Play className="h-3.5 w-3.5" />
          <span>Interactive Demo Gallery</span>
        </button>

        <button
          onClick={() => setActiveMode("upload")}
          className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeMode === "upload"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Upload Custom Model</span>
        </button>
      </div>

      {activeMode === "demo" ? (
        /* Demo Gallery */
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Synthetic Steganography Test Bench
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Test Model X-Ray against clean benchmark baselines versus synthetic models
              with controlled mantissa bit-plane perturbations (6.25%, 12.5%, and 25% embedding rates).
              Each artifact is strictly non-executable and labeled for security evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {demoModels.map((m) => {
              const isClean = m.label === "clean";

              return (
                <div
                  key={m.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 shadow-lg transition-all ${
                    isClean
                      ? "border-emerald-900/40 bg-[#0B0F19] hover:border-emerald-700/60"
                      : "border-rose-900/40 bg-[#0B0F19] hover:border-rose-700/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                          isClean
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-rose-950 text-rose-400 border-rose-800"
                        }`}
                      >
                        {isClean ? "CLEAN BENCHMARK" : `STEGO ${m.embedding_rate_percent}% ER`}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {m.architecture}
                      </span>
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-200">{m.name}</h4>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="mt-3 rounded bg-slate-900/80 px-2 py-1.5 font-mono text-[11px] text-slate-300 border border-slate-800">
                      <span className="text-slate-400">Expected: </span>
                      <span className={isClean ? "text-emerald-400" : "text-amber-400"}>
                        {m.expected_verdict}
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => onRunDemo(m.id)}
                    className={`mt-4 flex w-full items-center justify-center space-x-2 rounded-lg py-2 text-xs font-semibold text-white transition-all ${
                      loading
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 shadow-md"
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Run 10-Stage Scan</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Upload Mode */
        <div className="space-y-6">
          {/* Security Notice */}
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-blue-300">
                  Zero-Code-Execution SafeTensors Security Policy
                </h4>
                <p className="mt-1 text-xs text-blue-200/80 leading-relaxed">
                  Model X-Ray enforces zero code execution by only parsing validated SafeTensors (.safetensors)
                  files. Pickled PyTorch checkpoints (.pt/.pth/.bin) are deliberately rejected to protect clinical
                  infrastructure against arbitrary code execution exploits.
                </p>
              </div>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-950/20"
                : "border-slate-800 bg-[#0B0F19] hover:border-slate-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".safetensors,.pt,.pth,.bin"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-blue-400 mb-3">
              <Upload className="h-6 w-6" />
            </div>

            <h3 className="text-sm font-semibold text-slate-200">
              Drag and drop your AI model file here
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Only verified <span className="font-mono text-emerald-400 font-bold">.safetensors</span> files (Max 250 MB)
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-all border border-slate-700"
            >
              Browse Files
            </button>
          </div>

          {/* Format Error Box */}
          {formatError && (
            <div className="rounded-lg border border-rose-900/80 bg-rose-950/40 p-4">
              <div className="flex items-start space-x-3">
                <ShieldX className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-300">File Validation Rejected</h4>
                  <p className="mt-1 text-xs text-rose-200/90 leading-relaxed font-mono">
                    {formatError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && !formatError && (
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • SafeTensors Format
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handleUploadSubmit}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Begin 10-Stage Audit</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
