"use client";

import React, { useState } from "react";
import { Image as ImageIcon, ZoomIn, Info, Layers } from "lucide-react";

interface FourpartViewerProps {
  imageUrl?: string;
  shape?: number[];
}

export function FourpartViewer({ imageUrl, shape }: FourpartViewerProps) {
  const [selectedPlane, setSelectedPlane] = useState<number | null>(null);

  const planes = [
    {
      id: 0,
      title: "Plane 0 (Top-Left): Sign & Exponent",
      bits: "Bits 31-24",
      desc: "IEEE-754 sign bit + exponent field. Encodes tensor dynamic range and numerical magnitude.",
      interpretation: "High contrast macro-patterns representing layer architectural bounds.",
    },
    {
      id: 1,
      title: "Plane 1 (Top-Right): Upper Mantissa",
      bits: "Bits 23-16",
      desc: "High-order mantissa fractions. Captures significant learned filter weights.",
      interpretation: "Moderate spatial correlation reflecting trained feature representations.",
    },
    {
      id: 2,
      title: "Plane 2 (Bottom-Left): Mid Mantissa",
      bits: "Bits 15-8",
      desc: "Middle precision mantissa bits. Transition zone between structure and fine variation.",
      interpretation: "Smooth gradient transitions in clean models.",
    },
    {
      id: 3,
      title: "Plane 3 (Bottom-Right): Lowest LSB Mantissa",
      bits: "Bits 7-0 (LSBs)",
      desc: "Least significant bits. The primary attack vector for LSB steganography.",
      interpretation: "Natural clean models exhibit high structural coherence and local regularity; steganographic embedding introduces uncorrelated uniform noise.",
      isLsb: true,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-6 shadow-xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Grayscale-Fourpart Byte Plane Composite
          </h3>
        </div>
        {shape && (
          <span className="font-mono text-xs text-slate-400">
            Resolution: {shape[0]} × {shape[1]} px
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Image Preview Canvas */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950 p-4">
          {imageUrl ? (
            <div className="relative group max-w-full overflow-hidden rounded-md border border-slate-700 bg-black">
              <img
                src={imageUrl}
                alt="Grayscale-Fourpart representation"
                className="max-h-[340px] w-auto object-contain transition-transform group-hover:scale-105 duration-300"
              />
              {/* Quadrant Overlay Guide */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none border border-blue-500/20">
                <div className="border-r border-b border-blue-500/30 flex items-start p-1.5">
                  <span className="bg-black/80 px-1 py-0.5 text-[9px] font-mono text-blue-300 rounded">
                    P0: EXP
                  </span>
                </div>
                <div className="border-b border-blue-500/30 flex items-start justify-end p-1.5">
                  <span className="bg-black/80 px-1 py-0.5 text-[9px] font-mono text-blue-300 rounded">
                    P1: HIGH MANT
                  </span>
                </div>
                <div className="border-r border-blue-500/30 flex items-end p-1.5">
                  <span className="bg-black/80 px-1 py-0.5 text-[9px] font-mono text-blue-300 rounded">
                    P2: MID MANT
                  </span>
                </div>
                <div className="flex items-end justify-end p-1.5">
                  <span className="bg-rose-950/90 border border-rose-600/50 px-1 py-0.5 text-[9px] font-mono text-rose-300 rounded font-bold">
                    P3: LSB STEGO
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-slate-500">
              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
              <span className="text-xs">No Grayscale-Fourpart image available</span>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400 text-center">
            2×2 Fourpart composite decomposed according to Gilkarov & Dubin Algorithm 3.
          </p>
        </div>

        {/* Quadrant Explanations */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-2">
          {planes.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlane(selectedPlane === p.id ? null : p.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                p.isLsb
                  ? "border-rose-900/40 bg-rose-950/10 hover:border-rose-700/60"
                  : "border-slate-800/80 bg-slate-900/30 hover:border-slate-700"
              } ${selectedPlane === p.id ? "ring-1 ring-blue-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      p.isLsb
                        ? "bg-rose-900/60 text-rose-300 border border-rose-700"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {p.bits}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{p.title}</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{p.desc}</p>
              <p className="mt-1 text-[11px] font-mono text-slate-300">
                <span className="text-slate-400">Forensics: </span>
                {p.interpretation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
