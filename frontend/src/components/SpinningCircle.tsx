"use client";

import React from "react";

export function SpinningCircle() {
  return (
    <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center select-none font-mono p-4">
      {/* Outer 30s Continuous Linear Rotation SVG textPath */}
      <div className="absolute inset-0 animate-spin-30s">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <defs>
            <path
              id="heroCirclePath"
              d="M 200, 200 m -150, 0 a 150,150 0 1,1 300,0 a 150,150 0 1,1 -300,0"
            />
          </defs>
          <text className="text-[11px] tracking-[0.28em] font-mono uppercase fill-[#FAFAFA] font-bold">
            <textPath href="#heroCirclePath" startOffset="0%">
              DEFENSIVE AI MODEL STEGANALYSIS • IEEE-754 MANTISSA AUDIT • MODEL X-RAY •
            </textPath>
          </text>
        </svg>
      </div>

      {/* Central Brutalist Reticle Box */}
      <div className="w-40 h-40 border border-[#333333] bg-[#0A0A0A] flex flex-col items-center justify-center p-4 text-center space-y-1 relative">
        <span className="text-[9px] font-mono text-[#888888] tracking-widest uppercase">
          TENSOR PLANE
        </span>
        <span className="text-xl font-mono font-extrabold text-[#FAFAFA] tracking-wider">
          b00..b22
        </span>
        <span className="text-[8px] font-mono text-[#FAFAFA] bg-[#333333] px-2 py-0.5 uppercase tracking-widest mt-1">
          100% RECALL
        </span>

        {/* Crosshair Ticks */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-[#888888]">
          +
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-[#888888]">
          +
        </div>
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-[8px] text-[#888888]">
          +
        </div>
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-[8px] text-[#888888]">
          +
        </div>
      </div>
    </div>
  );
}
