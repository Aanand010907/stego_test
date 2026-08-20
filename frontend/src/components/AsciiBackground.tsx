"use client";

import React, { useEffect, useState } from "react";

const ASCII_GLYPHS = [
  "0", "1", "X", "M", "O", "D", "E", "L", "#", "%", "&", "@",
  "[", "]", "{", "}", "<", ">", "/", "\\", "+", "-", "=", "*",
  "A", "B", "C", "D", "E", "F", "8", "9", "2", "3", "4", "5",
];

export function AsciiBackground() {
  const [bgDataUrl, setBgDataUrl] = useState<string>("");

  useEffect(() => {
    // Generate lightweight tileable ASCII pattern on a small offscreen canvas
    const canvas = document.createElement("canvas");
    const cellWidth = 14;
    const cellHeight = 18;
    const cols = 32;
    const rows = 24;

    canvas.width = cols * cellWidth;
    canvas.height = rows * cellHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill canvas with deep brutalist background
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render dense monospace glyphs
    ctx.fillStyle = "#262626";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textBaseline = "top";

    let seed = 1337;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seed = (seed * 9301 + 49297) % 233280;
        const char = ASCII_GLYPHS[seed % ASCII_GLYPHS.length];
        ctx.fillText(char, c * cellWidth + 2, r * cellHeight + 2);
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    setBgDataUrl(dataUrl);
  }, []);

  if (!bgDataUrl) return <div className="absolute inset-0 bg-[#0A0A0A]" />;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none bg-repeat"
      style={{
        backgroundImage: `url(${bgDataUrl})`,
        backgroundSize: "448px 432px",
      }}
    />
  );
}
