"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Shield,
  Upload,
  BarChart3,
  FileText,
  LogOut,
  User,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { TransitionLink } from "./RouteTransitionProvider";

export function AppNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navTabs = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Scan Studio", href: "/scan", icon: Upload },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#282722] bg-[#10100D]/95 backdrop-blur-md font-sans">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand & Active Subsystem */}
        <div className="flex items-center space-x-6">
          <TransitionLink href="/" className="flex items-center space-x-2.5 group">
            <span className="font-mono text-xs font-bold tracking-[0.2em] text-bone uppercase">
              MODEL X-RAY
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-bone-dim px-1.5 py-0.5 border border-[#282722]">
              CONSOLE
            </span>
          </TransitionLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 font-mono text-xs">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <TransitionLink
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? "text-bone font-medium bg-[#1A1914] border border-[#34332D]"
                      : "text-bone-muted hover:text-bone hover:bg-[#141410]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </TransitionLink>
              );
            })}
          </nav>
        </div>

        {/* Right Status Badges & User Profile */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          {/* Live Engine Status Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-[#141410] border border-[#282722] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-bone-dim uppercase">ENGINE:</span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 border border-[#282722] bg-[#141410] hover:border-[#3A3830] text-bone transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-bone text-[#10100D] flex items-center justify-center text-[9px] font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-xs truncate max-w-[120px] hidden sm:inline">
                {user?.name || "Analyst"}
              </span>
              <ChevronDown className="w-3 h-3 text-bone-dim" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 border border-[#282722] bg-[#141410] p-3 shadow-2xl space-y-3 z-50 animate-in fade-in duration-100 font-mono text-xs">
                <div className="border-b border-[#282722] pb-2">
                  <div className="font-semibold text-bone">{user?.name || "Dr. Rachel Sterling"}</div>
                  <div className="text-[10px] text-bone-dim truncate">{user?.email}</div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 bg-[#1C1B16] border border-[#34332D] text-[9px] text-bone-muted uppercase">
                    {user?.role || "SecOps Lead"}
                  </div>
                </div>

                <div className="space-y-1">
                  <TransitionLink
                    href="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-2 py-1 text-bone-muted hover:text-bone hover:bg-[#1C1B16] transition-colors"
                  >
                    Console Overview
                  </TransitionLink>
                  <TransitionLink
                    href="/scan"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-2 py-1 text-bone-muted hover:text-bone hover:bg-[#1C1B16] transition-colors"
                  >
                    Scan SafeTensors
                  </TransitionLink>
                </div>

                <div className="border-t border-[#282722] pt-2">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2 px-2 py-1 text-red-400 hover:bg-red-950/40 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
