"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Terminal } from "lucide-react";
import { TransitionLink } from "./AsciiMaskTransition";
import { useAuth } from "../lib/auth";

export function BrutalistNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: "[01] HOME", href: "/" },
    { label: "[02] FEATURES", href: "/features" },
    { label: "[03] FAQ", href: "/faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-[#333333] font-mono select-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
        {/* Brand */}
        <TransitionLink href="/" className="flex items-center space-x-3 group">
          <div className="bg-[#FAFAFA] text-[#0A0A0A] px-2 py-0.5 text-xs font-black tracking-widest uppercase group-hover:bg-[#333333] group-hover:text-[#FAFAFA] transition-none">
            X-RAY
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-[#FAFAFA] uppercase">
            MODEL X-RAY // SPA
          </span>
        </TransitionLink>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <TransitionLink
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-none ${
                  isActive
                    ? "bg-[#FAFAFA] text-[#0A0A0A] font-bold"
                    : "text-[#888888] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                }`}
              >
                {item.label}
              </TransitionLink>
            );
          })}
        </nav>

        {/* Right Console CTA & Keyboard Indicator */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-1 text-[10px] text-[#888888] border border-[#333333] px-2.5 py-1">
            <span>NAV:</span>
            <span className="text-[#FAFAFA] font-bold">[←]</span>
            <span className="text-[#FAFAFA] font-bold">[→]</span>
          </div>

          <TransitionLink
            href={isAuthenticated ? "/dashboard" : "/login?redirect=/scan"}
            className="brutal-btn-primary px-4 py-1.5 text-xs font-bold tracking-wider inline-flex items-center space-x-1.5"
          >
            <span>{isAuthenticated ? "CONSOLE →" : "SCAN →"}</span>
          </TransitionLink>
        </div>
      </div>
    </header>
  );
}
