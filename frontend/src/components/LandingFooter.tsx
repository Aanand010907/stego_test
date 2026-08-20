"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { TransitionLink } from "./RouteTransitionProvider";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#282722] bg-[#0E0E0B] text-bone-muted py-20 px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-[#282722]">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-bone uppercase block">
                MODEL X-RAY
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-bone-dim">
                DEFENSIVE AI WEIGHT STEGANALYSIS PLATFORM
              </span>
            </div>
            <p className="text-xs text-bone-muted max-w-md leading-relaxed">
              Model X-Ray is an open, verifiable defensive AI steganalysis platform designed to inspect SafeTensors weights, extract bit-level statistics, generate composite representations, and detect supply-chain tampering prior to production deployment.
            </p>
            <div className="flex items-center space-x-4 pt-2 font-mono text-[10px] text-bone-dim">
              <span>FORMAT: SAFETENSORS</span>
              <span>•</span>
              <span>PIPELINE: 10 STAGES</span>
              <span>•</span>
              <span>CORPUS: 55 MODELS</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <TransitionLink href="/login?redirect=/dashboard" className="hover:text-bone transition-colors">
                  Security Console →
                </TransitionLink>
              </li>
              <li>
                <TransitionLink href="/login?redirect=/scan" className="hover:text-bone transition-colors">
                  Scan Studio →
                </TransitionLink>
              </li>
              <li>
                <a href="#problem" className="hover:text-bone transition-colors">
                  01 // Supply-Chain Risk
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-bone transition-colors">
                  02 // Capabilities
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-bone transition-colors">
                  03 // Workflow
                </a>
              </li>
              <li>
                <a href="#validation" className="hover:text-bone transition-colors">
                  04 // Validation
                </a>
              </li>
            </ul>
          </div>

          {/* Scientific Documentation */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone">
              Scientific References
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <a
                  href="https://arxiv.org/abs/2409.19310"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 hover:text-bone transition-colors text-bone-muted"
                >
                  <span>Gilkarov &amp; Dubin (2024)</span>
                  <ArrowUpRight className="w-3 h-3 text-bone-dim" />
                </a>
              </li>
              <li className="text-bone-dim text-[10px]">arXiv:2409.19310</li>
              <li>
                <a
                  href="https://github.com/huggingface/safetensors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 hover:text-bone transition-colors text-bone-muted"
                >
                  <span>SafeTensors Specification</span>
                  <ArrowUpRight className="w-3 h-3 text-bone-dim" />
                </a>
              </li>
              <li className="text-bone-dim text-[10px]">IEEE-754 Bit Slicing</li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-bone-dim">
          <div>
            © {new Date().getFullYear()} MODEL X-RAY RESEARCH PLATFORM. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center space-x-6">
            <span>ZERO-TRUST MODEL AUDITING</span>
            <span>VERIFIED ON REAL CHECKPOINTS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
