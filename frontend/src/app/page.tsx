"use client";

import React from "react";
import { ArrowRight, Terminal, Binary, ShieldAlert, Cpu, Activity } from "lucide-react";
import { BrutalistNav } from "../components/BrutalistNav";
import { BrutalistFooter } from "../components/BrutalistFooter";
import { SpinningCircle } from "../components/SpinningCircle";
import { TransitionLink } from "../components/AsciiMaskTransition";
import { useAuth } from "../lib/auth";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-[#FAFAFA] selection:text-[#0A0A0A]">
      <BrutalistNav />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: 70/30 Brutalist Split Layout with 1px #333 Borders */}
      {/* ========================================================================= */}
      <section className="pt-28 pb-16 px-4 sm:px-8 border-b border-[#333333]">
        <div className="mx-auto max-w-7xl">
          {/* 70/30 Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-10 border border-[#333333]">
            {/* Left 70% Panel (Col 1-7) */}
            <div className="lg:col-span-7 p-8 sm:p-12 md:p-16 border-b lg:border-b-0 lg:border-r border-[#333333] flex flex-col justify-between space-y-12 bg-[#0A0A0A]">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#888888] border border-[#333333] px-3 py-1 bg-[#0F0F0F]">
                  <span className="w-1.5 h-1.5 bg-[#FAFAFA]" />
                  <span>MODEL X-RAY // DEFENSIVE STEGANALYSIS</span>
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-black tracking-tight text-[#FAFAFA] uppercase leading-[0.95]">
                  VERIFY THE AI MODEL BEFORE IT REACHES PRODUCTION.
                </h1>

                <p className="text-xs sm:text-sm text-[#888888] font-sans max-w-2xl leading-relaxed">
                  Adversaries can embed exfiltration payloads, backdoor triggers, and unauthorized code inside the mantissa bits of legitimate neural network weights without shifting benchmark loss. Model X-Ray provides automated defensive steganalysis to audit weights before deployment.
                </p>
              </div>

              {/* Action Buttons with Harsh Color Inversion */}
              <div className="flex flex-wrap items-center gap-4 font-mono">
                <TransitionLink
                  href={isAuthenticated ? "/dashboard" : "/login?redirect=/scan"}
                  className="brutal-btn-primary px-8 py-4 text-xs font-bold tracking-widest inline-flex items-center space-x-2"
                >
                  <span>{isAuthenticated ? "LAUNCH CONSOLE →" : "SCAN A MODEL →"}</span>
                </TransitionLink>

                <TransitionLink
                  href="/features"
                  className="brutal-btn px-8 py-4 text-xs font-bold tracking-widest text-[#FAFAFA] inline-flex items-center space-x-2"
                >
                  <span>EXPLORE SPECS →</span>
                </TransitionLink>
              </div>

              {/* Technical Telemetry Strip */}
              <div className="pt-8 border-t border-[#333333] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[10px]">
                <div>
                  <span className="text-[#888888] block uppercase">FORMAT</span>
                  <span className="text-[#FAFAFA] font-bold">SAFETENSORS</span>
                </div>
                <div>
                  <span className="text-[#888888] block uppercase">PIPELINE</span>
                  <span className="text-[#FAFAFA] font-bold">10 STAGES</span>
                </div>
                <div>
                  <span className="text-[#888888] block uppercase">CORPUS</span>
                  <span className="text-[#FAFAFA] font-bold">55 MODELS</span>
                </div>
                <div>
                  <span className="text-[#888888] block uppercase">KEYBOARD</span>
                  <span className="text-[#FAFAFA] font-bold">[←] [→] ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Right 30% Panel (Col 8-10): Contains the Spinning SVG Circle */}
            <div className="lg:col-span-3 p-8 flex flex-col items-center justify-center bg-[#0F0F0F] relative overflow-hidden">
              <SpinningCircle />
              <div className="mt-6 text-center font-mono text-[10px] text-[#888888] tracking-widest uppercase">
                CIRCULAR IEEE-754 SENSOR MASK
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE PROBLEM (Stark 2-Column Monospace Layout) */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-8 border-b border-[#333333] bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-[#333333]">
            <div className="lg:col-span-4 p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#333333] space-y-3 bg-[#0F0F0F]">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#888888] block">
                01 // THREAT VECTOR
              </span>
              <h2 className="text-2xl sm:text-3xl font-mono font-bold uppercase text-[#FAFAFA]">
                THE SILENT ATTACK SURFACE
              </h2>
            </div>

            <div className="lg:col-span-8 p-8 sm:p-12 space-y-6 text-xs sm:text-sm text-[#888888] font-sans leading-relaxed">
              <p>
                In standard IEEE-754 floating point representation, single-precision floats allocate 1 sign bit, 8 exponent bits, and 23 mantissa bits. Lower mantissa bits (b00..b07) contribute less than 10⁻⁷ to parameter magnitudes.
              </p>
              <p>
                Adversaries can inject arbitrary payload streams into these low-significance bits. Traditional SHA-256 integrity hashes verify file download authenticity, but cannot identify whether valid neural weights contain steganographic injection.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#333333] font-mono text-xs">
                <div className="p-4 border border-[#333333] bg-[#0F0F0F] space-y-1">
                  <span className="text-red-400 font-bold block uppercase">HASH CHECKERS FAIL</span>
                  <p className="text-[11px] text-[#888888] font-sans">
                    Verifies origin signature only; ignores payload injection in mathematical matrices.
                  </p>
                </div>
                <div className="p-4 border border-[#333333] bg-[#0F0F0F] space-y-1">
                  <span className="text-emerald-400 font-bold block uppercase">MODEL X-RAY DEFENSE</span>
                  <p className="text-[11px] text-[#888888] font-sans">
                    Bit-plane Shannon entropy, transition regularity, and Siamese CNN metric distances.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EMPIRICAL VALIDATION (Stark Brutalist Table) */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-8 border-b border-[#333333]">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#888888] block">
                02 // EMPIRICAL VALIDATION
              </span>
              <h2 className="text-2xl sm:text-4xl font-mono font-black uppercase text-[#FAFAFA]">
                MEASURED BENCHMARK MATRIX
              </h2>
            </div>
            <div className="font-mono text-[10px] text-[#888888] border border-[#333333] px-3 py-1">
              HELD-OUT REAL-WORLD TEST SPLIT
            </div>
          </div>

          <div className="border border-[#333333] overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0F0F0F] text-[#888888] uppercase text-[10px] border-b border-[#333333]">
                <tr>
                  <th className="p-4">CATEGORY</th>
                  <th className="p-4">SAMPLES</th>
                  <th className="p-4">DETECTED</th>
                  <th className="p-4">MEASURED RECALL / SPECIFICITY</th>
                  <th className="p-4">RISK VERDICT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333] text-[#888888]">
                <tr className="brutal-row-hover">
                  <td className="p-4 font-bold text-[#FAFAFA]">STRUCTURED NON-RNG STEGO</td>
                  <td className="p-4">16</td>
                  <td className="p-4 text-emerald-400 font-bold">16</td>
                  <td className="p-4 text-emerald-400 font-bold">100.0% RECALL</td>
                  <td className="p-4 text-red-400 font-bold">HIGH / CRITICAL</td>
                </tr>
                <tr className="brutal-row-hover">
                  <td className="p-4 font-bold text-[#FAFAFA]">CLEAN PRETRAINED MODELS</td>
                  <td className="p-4">6</td>
                  <td className="p-4 text-[#FAFAFA]">5</td>
                  <td className="p-4 text-[#FAFAFA] font-bold">83.3% SPECIFICITY</td>
                  <td className="p-4 text-emerald-400 font-bold">LOW (CLEARED)</td>
                </tr>
                <tr className="brutal-row-hover">
                  <td className="p-4 font-bold text-[#FAFAFA]">UNIFORM PSEUDORANDOM (RNG)</td>
                  <td className="p-4">16</td>
                  <td className="p-4">0</td>
                  <td className="p-4 text-[#888888]">0.0% (WHOLE-MODEL MOMENTS)</td>
                  <td className="p-4 text-[#888888]">LOW (REQUIRES ACF)</td>
                </tr>
                <tr className="brutal-row-hover">
                  <td className="p-4 font-bold text-[#FAFAFA]">RESEARCH BACKDOORS (POISON/LORA)</td>
                  <td className="p-4">3</td>
                  <td className="p-4 text-[#FAFAFA]">2</td>
                  <td className="p-4 text-[#FAFAFA] font-bold">SEPARATE BACKDOOR STUDY</td>
                  <td className="p-4 text-amber-400 font-bold">HIGH / CRITICAL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-8 text-center bg-[#0F0F0F]">
        <div className="mx-auto max-w-4xl space-y-8 font-mono">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#888888] block">
            ZERO TRUST NEURAL DEPLOYMENT
          </span>

          <h2 className="text-3xl sm:text-5xl font-black uppercase text-[#FAFAFA] tracking-tight">
            NEVER DEPLOY AN UNVERIFIED MODEL.
          </h2>

          <p className="text-xs sm:text-sm text-[#888888] font-sans max-w-xl mx-auto leading-relaxed">
            Audit PyTorch and SafeTensors weights for steganographic payloads and supply-chain tampering in seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <TransitionLink
              href={isAuthenticated ? "/dashboard" : "/login?redirect=/scan"}
              className="brutal-btn-primary px-8 py-4 text-xs font-bold tracking-widest inline-flex items-center space-x-2"
            >
              <span>{isAuthenticated ? "OPEN CONSOLE →" : "SCAN A MODEL →"}</span>
            </TransitionLink>

            <TransitionLink
              href="/features"
              className="brutal-btn px-8 py-4 text-xs font-bold tracking-widest text-[#FAFAFA]"
            >
              <span>VIEW ALL FEATURES [→]</span>
            </TransitionLink>
          </div>
        </div>
      </section>

      <BrutalistFooter />
    </div>
  );
}
