"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { TransitionLink } from "./RouteTransitionProvider";

export function LandingNav() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "01 // Risk", href: "#problem" },
    { label: "02 // Capabilities", href: "#capabilities" },
    { label: "03 // Workflow", href: "#workflow" },
    { label: "04 // Validation", href: "#validation" },
    { label: "05 // Research", href: "#research" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#10100D]/95 backdrop-blur-md border-b border-[#282722] py-4 shadow-xl"
          : "bg-transparent py-6"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Brand Link */}
        <TransitionLink href="/" className="flex items-center space-x-3 group">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-bone uppercase">
                MODEL X-RAY
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-bone-dim px-1.5 py-0.5 border border-[#282722]">
                v2.4
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-widest text-bone-dim uppercase mt-0.5">
              Defensive AI Steganalysis
            </p>
          </div>
        </TransitionLink>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[11px] font-mono tracking-wider uppercase text-bone-muted hover:text-bone transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Auth / Action CTA */}
        <div className="hidden sm:flex items-center space-x-5 font-mono">
          {isAuthenticated ? (
            <TransitionLink
              href="/dashboard"
              className="btn-invert inline-flex items-center space-x-2 px-4 py-2 text-[11px] uppercase tracking-wider"
            >
              <span>Security Console</span>
              <ArrowRight className="w-3 h-3" />
            </TransitionLink>
          ) : (
            <>
              <TransitionLink
                href="/login"
                className="text-[11px] uppercase tracking-wider text-bone-muted hover:text-bone px-2 transition-colors"
              >
                Sign In
              </TransitionLink>
              <TransitionLink
                href="/login?redirect=/scan"
                className="btn-invert-primary inline-flex items-center space-x-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
              >
                <span>Scan a Model →</span>
              </TransitionLink>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-bone-muted hover:text-bone"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#10100D] border-b border-[#282722] px-6 py-6 space-y-5 shadow-2xl animate-in fade-in duration-150">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono uppercase tracking-wider text-bone-muted hover:text-bone py-1"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#282722] flex flex-col space-y-3 font-mono">
            {isAuthenticated ? (
              <TransitionLink
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 border border-[#34332D] bg-[#161612] py-2.5 text-xs uppercase text-bone"
              >
                <span>Open Security Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </TransitionLink>
            ) : (
              <>
                <TransitionLink
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs uppercase text-bone-muted py-2 border border-[#282722]"
                >
                  Sign In
                </TransitionLink>
                <TransitionLink
                  href="/login?redirect=/scan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 bg-bone text-[#10100D] py-2.5 text-xs font-semibold uppercase tracking-wider border border-bone"
                >
                  <span>Scan a Model →</span>
                </TransitionLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
