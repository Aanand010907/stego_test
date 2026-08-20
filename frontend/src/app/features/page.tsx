"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Binary, Cpu, Layers, Lock, ShieldCheck, FileCheck } from "lucide-react";
import { BrutalistNav } from "../../components/BrutalistNav";
import { BrutalistFooter } from "../../components/BrutalistFooter";
import { TransitionLink } from "../../components/AsciiMaskTransition";
import { useAuth } from "../../lib/auth";

export default function FeaturesPage() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      num: "01",
      title: "SAFETENSORS BINARY INGESTION",
      tag: "ZERO-DESERIALIZATION",
      desc: "Direct memory mapping and zero-copy binary buffer parsing for float32, float16, and bfloat16 tensors. Completely eliminates arbitrary Python pickle code execution vectors.",
      spec: "MAX FILE: 2.0GB • TIME: < 50ms • PARSER: RUST SAFETENSORS",
    },
    {
      num: "02",
      title: "WEIGHT-LEVEL STATISTICAL MOMENTS",
      tag: "MACROSCOPIC DENSITY",
      desc: "Evaluates macroscopic moments across all parameter tensors: mean, standard deviation, skewness, kurtosis, and 256-bin value histogram entropy to detect macro distribution clamping.",
      spec: "MOMENTS: 4TH ORDER • BINS: 256 • METRIC: SHANNON VALUE ENTROPY",
    },
    {
      num: "03",
      title: "IEEE-754 BIT-LEVEL STEGANALYSIS",
      tag: "MANTISSA EXTRACTION",
      desc: "Extracts individual IEEE-754 mantissa bit-planes (b00..b07). Calculates Shannon LSB entropy, bit frequency deviation (delta_freq), and adjacent-bit transition regularity (R).",
      spec: "BIT DEPTH: 8 LSB • METRICS: ENTROPY / DELTA_FREQ / REGULARITY (R)",
    },
    {
      num: "04",
      title: "GRAYSCALE-FOURPART MAPPING",
      tag: "SPATIAL 256X256 IMAGE",
      desc: "Renders 32-bit floating point parameter byte-planes into standardized 4-quadrant grayscale composite images based on the Gilkarov & Dubin (2024) scientific methodology.",
      spec: "RESOLUTION: 256X256 • QUADRANTS: 4 • DEPTH: 8-BIT GRAYSCALE",
    },
    {
      num: "05",
      title: "FEW-SHOT SIAMESE METRIC CNN",
      tag: "EMBEDDING CLUSTERING",
      desc: "Embeds grayscale-fourpart composite representations into a normalized metric space, measuring Euclidean distance against an empirical gallery of verified clean reference checkpoints.",
      spec: "ARCHITECTURE: SIAMESE RESIDUAL • METRIC: EUCLIDEAN CENTROID DIST",
    },
    {
      num: "06",
      title: "TRUSTED REFERENCE VERIFICATION",
      tag: "FORENSIC AUDIT DOSSIER",
      desc: "Performs layer-by-layer delta analysis against trusted base weights, generating cryptographic audit trails, component risk scores, and printable compliance PDF reports.",
      spec: "SCORING: WEIGHTED MULTI-MOMENT • RISK BANDS: LOW / MED / HIGH / CRIT",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-[#FAFAFA] selection:text-[#0A0A0A]">
      <BrutalistNav />

      <main className="pt-28 pb-20 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Header */}
          <div className="border-b border-[#333333] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#888888]">
                <span>PAGE [02] // SYSTEM SPECIFICATIONS</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-mono font-black uppercase text-[#FAFAFA] tracking-tight">
                CORE CAPABILITIES
              </h1>
            </div>
            <div className="font-mono text-xs text-[#888888] space-y-1">
              <div>6 SYNCHRONIZED DEFENSIVE VECTORS</div>
              <div className="text-[#FAFAFA] font-bold">NAVIGATE: [← PREV] [NEXT →]</div>
            </div>
          </div>

          {/* Brutalist Large Feature List */}
          <div className="border-t border-[#333333] divide-y divide-[#333333]">
            {features.map((f) => (
              <div
                key={f.num}
                className="brutal-row-hover p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#0A0A0A]"
              >
                {/* Massive Monospaced Number */}
                <div className="lg:col-span-2 font-mono text-5xl sm:text-7xl font-black tracking-tighter text-[#333333]">
                  {f.num}
                </div>

                {/* Title & Tag */}
                <div className="lg:col-span-4 space-y-2">
                  <h2 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight">
                    {f.title}
                  </h2>
                  <div className="inline-block font-mono text-[10px] uppercase tracking-widest border border-[#333333] px-2 py-0.5 bg-[#0F0F0F]">
                    {f.tag}
                  </div>
                </div>

                {/* Description & Technical Specs */}
                <div className="lg:col-span-6 space-y-4">
                  <p className="text-xs sm:text-sm font-sans leading-relaxed text-[#888888]">
                    {f.desc}
                  </p>
                  <div className="font-mono text-[10px] text-[#888888] pt-2 border-t border-[#333333]">
                    {f.spec}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs border-t border-[#333333]">
            <TransitionLink
              href="/"
              className="brutal-btn px-6 py-3 font-bold inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[←] HOME</span>
            </TransitionLink>

            <TransitionLink
              href="/faq"
              className="brutal-btn-primary px-8 py-3 font-bold inline-flex items-center space-x-2"
            >
              <span>NEXT: FAQ [→]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </TransitionLink>
          </div>
        </div>
      </main>

      <BrutalistFooter />
    </div>
  );
}
