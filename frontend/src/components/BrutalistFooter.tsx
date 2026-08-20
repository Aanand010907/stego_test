"use client";

import React from "react";
import { TransitionLink } from "./AsciiMaskTransition";

export function BrutalistFooter() {
  return (
    <footer className="border-t border-[#333333] bg-[#0A0A0A] text-[#888888] py-12 px-4 sm:px-8 font-mono text-xs select-none">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-[#FAFAFA] font-bold uppercase tracking-widest">
            MODEL X-RAY // BRUTALIST ASCII SPA
          </div>
          <div className="text-[10px] text-[#888888]">
            DEFENSIVE WEIGHT STEGANALYSIS &amp; ZERO-TRUST INTEGRITY AUDITING
          </div>
        </div>

        <div className="flex items-center space-x-6 text-[11px]">
          <TransitionLink href="/" className="hover:text-[#FAFAFA] uppercase transition-none">
            [01] HOME
          </TransitionLink>
          <TransitionLink href="/features" className="hover:text-[#FAFAFA] uppercase transition-none">
            [02] FEATURES
          </TransitionLink>
          <TransitionLink href="/faq" className="hover:text-[#FAFAFA] uppercase transition-none">
            [03] FAQ
          </TransitionLink>
          <TransitionLink href="/dashboard" className="hover:text-[#FAFAFA] uppercase transition-none">
            [04] CONSOLE
          </TransitionLink>
        </div>

        <div className="text-[10px] text-[#888888] border border-[#333333] px-3 py-1.5 text-center">
          USE <span className="text-[#FAFAFA] font-bold">[←]</span> / <span className="text-[#FAFAFA] font-bold">[→]</span> TO NAVIGATE PAGES
        </div>
      </div>
    </footer>
  );
}
