"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, Key, UserCheck, AlertCircle } from "lucide-react";
import { useAuth, User } from "../../lib/auth";
import { TransitionLink, useRouteTransition } from "../../components/RouteTransitionProvider";

function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const { navigateTo } = useRouteTransition();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("SecOps Lead");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  React.useEffect(() => {
    if (isAuthenticated) {
      navigateTo(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, navigateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your organization email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, role);
      navigateTo(redirectTarget);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole: User["role"], demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await login(demoEmail, demoRole);
      navigateTo(redirectTarget);
    } catch (err: any) {
      setError(err.message || "Quick login failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 font-sans">
      {/* Brand Header */}
      <div className="space-y-2 text-center sm:text-left">
        <TransitionLink href="/" className="inline-flex items-center space-x-2 group">
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-bone uppercase">
            MODEL X-RAY
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-bone-dim px-1.5 py-0.5 border border-[#282722]">
            AUTH
          </span>
        </TransitionLink>
        <h1 className="text-3xl font-serif font-light tracking-tight text-bone sm:text-4xl pt-1">
          Security Console Access
        </h1>
        <p className="text-xs font-mono text-bone-dim">
          Authenticate to inspect neural checkpoints &amp; audit weight integrity.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="border border-[#282722] bg-[#141410] p-8 shadow-2xl space-y-6">
        {error && (
          <div className="flex items-center space-x-2 bg-red-950/80 border border-red-800 p-3 text-xs text-red-300 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-wider text-bone-dim">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-bone-dim absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@enterprise.ai"
                className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone placeholder-bone-dim focus:border-bone focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-wider text-bone-dim">
              Security Role
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-bone-dim absolute left-3.5 top-3" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
                className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone focus:border-bone focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="SecOps Lead">SecOps Lead</option>
                <option value="ML Engineer">ML Engineer</option>
                <option value="Security Analyst">Security Analyst</option>
                <option value="Auditor">Compliance Auditor</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-wider text-bone-dim">
              Password (Demo Sandbox)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-bone-dim absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone placeholder-bone-dim focus:border-bone focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-invert-primary w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 text-xs font-mono font-semibold uppercase tracking-wider"
          >
            <span>{loading ? "Authenticating..." : "Sign In →"}</span>
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="pt-4 border-t border-[#282722] space-y-3 font-mono">
          <span className="text-[10px] uppercase tracking-widest text-bone-dim block text-center">
            One-Click Demo Profiles
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin("SecOps Lead", "secops.lead@defense.ai")}
              className="p-2.5 border border-[#282722] bg-[#0E0E0B] hover:border-bone text-left text-[11px] text-bone transition-all"
            >
              <span className="block font-semibold text-bone">SecOps Lead</span>
              <span className="text-[9px] text-bone-dim">secops@defense.ai</span>
            </button>
            <button
              onClick={() => handleQuickDemoLogin("ML Engineer", "ml.engineer@defense.ai")}
              className="p-2.5 border border-[#282722] bg-[#0E0E0B] hover:border-bone text-left text-[11px] text-bone transition-all"
            >
              <span className="block font-semibold text-bone">ML Engineer</span>
              <span className="text-[9px] text-bone-dim">ml@defense.ai</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="text-center font-mono text-xs text-bone-dim">
        <span>Need an analyst seat? </span>
        <TransitionLink href="/signup" className="text-bone hover:underline ml-1">
          Create account →
        </TransitionLink>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#10100D] text-bone flex items-center justify-center p-6 selection:bg-[#34332D] selection:text-white">
      <Suspense fallback={<div className="font-mono text-xs text-bone-dim">Loading session...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
