"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrutalistNav } from "../../components/BrutalistNav";
import { BrutalistFooter } from "../../components/BrutalistFooter";
import { TransitionLink } from "../../components/AsciiMaskTransition";
import { useAuth } from "../../lib/auth";

export default function FAQPage() {
  const { isAuthenticated } = useAuth();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    {
      qNum: "Q.001",
      question: "HOW DOES MODEL STEGANOGRAPHY DIFFER FROM TRADITIONAL MALWARE?",
      answer:
        "Traditional malware relies on serialized payloads inside executable files, shell scripts, or pickle bytecode archives. In contrast, neural steganography embeds arbitrary data directly into IEEE-754 mantissa bits of legitimate weight matrices. The model continues to execute standard inference with zero accuracy loss, but the weight tensor itself contains an encrypted or covert binary payload.",
      spec: "THREAT VECTOR: IEEE-754 MANTISSA INJECTION (b00..b07)",
    },
    {
      qNum: "Q.002",
      question: "WHY DO STANDARD SHA-256 HASHES FAIL TO PROTECT SUPPLY CHAINS?",
      answer:
        "Cryptographic hashes verify that the downloaded artifact matches the file uploaded by the author. However, if the checkpoint was trained, fine-tuned, or modified upstream with embedded payloads, the SHA-256 signature is perfectly valid yet the weights remain compromised. Model X-Ray audits the internal mathematical distributions rather than relying solely on file-level hash integrity.",
      spec: "LIMITATION: ORIGIN AUTHENTICITY ≠ INTERNAL MATHEMATICAL PURITY",
    },
    {
      qNum: "Q.003",
      question: "WHAT IS THE GRAYSCALE-FOURPART REPRESENTATION?",
      answer:
        "Derived from the published research of Gilkarov & Dubin (2024, arXiv:2409.19310), Grayscale-Fourpart mapping reorganizes 32-bit floating point weight tensors into standardized 4-quadrant 256×256 8-bit images. Each quadrant represents a distinct byte significance plane (Byte 0 LSB to Byte 3 MSB), transforming numerical perturbations into spatial image features analyzed by Siamese CNNs.",
      spec: "REPRESENTATION: 4-QUADRANT BYTE-PLANE 256X256 PROJECTION",
    },
    {
      qNum: "Q.004",
      question: "WHAT DETECTION RECALL HAS BEEN EMPIRICALLY MEASURED?",
      answer:
        "Across our held-out 55-checkpoint real-world evaluation corpus (including ResNet, DenseNet, MobileNet, EfficientNet, Swin, ConvNeXt, and ALBERT), Model X-Ray achieved 100.0% detection recall on structured non-RNG payloads across 1, 2, 4, and 8 LSB rates, and 83.3% clean specificity on genuine held-out clean architectures.",
      spec: "EMPIRICAL MATRIX: 16/16 STRUCTURED RECALL • 5/6 CLEAN SPECIFICITY",
    },
    {
      qNum: "Q.005",
      question: "DOES MODEL X-RAY EXECUTE ARBITRARY PYTHON PICKLE FILES?",
      answer:
        "No. Model X-Ray strictly enforces SafeTensors binary ingestion. By utilizing zero-copy Rust and C binary parsers, all tensors are read directly from memory buffers without ever unpickling Python objects, securing the security scanner itself against arbitrary deserialization exploits.",
      spec: "SECURITY POLICY: STRICT SAFETENSORS ZERO-DESERIALIZATION",
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
                <span>PAGE [03] // SYSTEM DOCUMENTATION</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-mono font-black uppercase text-[#FAFAFA] tracking-tight">
                FREQUENTLY ASKED QUESTIONS
              </h1>
            </div>
            <div className="font-mono text-xs text-[#888888] space-y-1">
              <div>DEFENSIVE STEGANALYSIS FAQ</div>
              <div className="text-[#FAFAFA] font-bold">NAVIGATE: [← PREV] [NEXT →]</div>
            </div>
          </div>

          {/* Brutalist Custom Accordion */}
          <div className="border-t border-[#333333] divide-y divide-[#333333]">
            {faqItems.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.qNum}
                  className={`transition-none bg-[#0A0A0A] ${
                    isOpen ? "bg-[#0F0F0F]" : "hover:bg-[#141414]"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-6 sm:p-8 flex items-center justify-between text-left group select-none font-mono"
                  >
                    <div className="flex items-center space-x-6 sm:space-x-8">
                      <span className="text-xs sm:text-sm font-bold text-[#888888] group-hover:text-[#FAFAFA]">
                        {item.qNum}
                      </span>
                      <span className="text-xs sm:text-base font-bold uppercase tracking-wider text-[#FAFAFA]">
                        {item.question}
                      </span>
                    </div>

                    <div className="text-lg font-bold text-[#FAFAFA] ml-4 transition-none font-mono">
                      {isOpen ? "×" : "+"}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-8 sm:px-8 space-y-4 border-t border-[#222222]">
                      <p className="text-xs sm:text-sm text-[#888888] font-sans leading-relaxed pt-4 max-w-4xl">
                        {item.answer}
                      </p>
                      <div className="font-mono text-[10px] text-[#FAFAFA] bg-[#0A0A0A] border border-[#333333] p-2 inline-block">
                        {item.spec}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs border-t border-[#333333]">
            <TransitionLink
              href="/features"
              className="brutal-btn px-6 py-3 font-bold inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[←] FEATURES</span>
            </TransitionLink>

            <TransitionLink
              href={isAuthenticated ? "/dashboard" : "/login?redirect=/scan"}
              className="brutal-btn-primary px-8 py-3 font-bold inline-flex items-center space-x-2"
            >
              <span>OPEN SECURITY CONSOLE [→]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </TransitionLink>
          </div>
        </div>
      </main>

      <BrutalistFooter />
    </div>
  );
}
