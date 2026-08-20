"use client";

import React from "react";

export function CircularTypoVisual() {
  return (
    <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center select-none font-mono">
      {/* Outer Rotating Typographical Ring 1 (Clockwise, 40s) */}
      <div className="absolute inset-0 animate-spin-slow">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <defs>
            <path
              id="circlePathOuter"
              d="M 200, 200 m -160, 0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0"
            />
          </defs>
          <text className="text-[10px] tracking-[0.24em] uppercase fill-[#AAA59A]">
            <textPath href="#circlePathOuter" startOffset="0%">
              MODEL X-RAY • AI MODEL SECURITY • MODEL INTEGRITY • DEFENSIVE STEGANALYSIS • IEEE-754 MANTISSA •
            </textPath>
          </text>
        </svg>
      </div>

      {/* Counter-rotating Inner Typographical Ring 2 (Counter-Clockwise, 30s) */}
      <div
        className="absolute inset-8"
        style={{
          animation: "spin-slow 30s linear infinite reverse",
        }}
      >
        <svg viewBox="0 0 340 340" className="w-full h-full">
          <defs>
            <path
              id="circlePathInner"
              d="M 170, 170 m -115, 0 a 115,115 0 1,1 230,0 a 115,115 0 1,1 -230,0"
            />
          </defs>
          <text className="text-[8px] tracking-[0.28em] uppercase fill-[#736F66]">
            <textPath href="#circlePathInner" startOffset="0%">
              SAFETENSORS BINARY BUFFER • MULTI-MOMENT BIT EXTRACTION • SIAMESE CNN •
            </textPath>
          </text>
        </svg>
      </div>

      {/* Static Concentric Hairline Wireframe & Crosshairs */}
      <div className="absolute inset-16 border border-[#282722] rounded-full flex items-center justify-center">
        {/* Inner Circle */}
        <div className="w-3/4 h-3/4 border border-[#24231E] rounded-full flex items-center justify-center">
          {/* Central Architecture Plate */}
          <div className="w-1/2 h-1/2 border border-[#34332D] bg-[#141410] flex flex-col items-center justify-center p-3 text-center space-y-1">
            <span className="text-[8px] text-bone-dim tracking-widest uppercase">
              BIT PLANE
            </span>
            <span className="text-xs font-bold text-bone tracking-wider">
              b00..b22
            </span>
            <span className="text-[7px] text-emerald-400 font-semibold tracking-widest uppercase">
              100% RECALL
            </span>
          </div>
        </div>

        {/* Crosshairs & Coordinate Ticks */}
        <div className="absolute w-full h-px bg-[#24231E]" />
        <div className="absolute h-full w-px bg-[#24231E]" />

        {/* Degree Markers */}
        <span className="absolute top-1 text-[8px] text-bone-dim">000°</span>
        <span className="absolute bottom-1 text-[8px] text-bone-dim">180°</span>
        <span className="absolute left-1 text-[8px] text-bone-dim">270°</span>
        <span className="absolute right-1 text-[8px] text-bone-dim">090°</span>
      </div>
    </div>
  );
}
