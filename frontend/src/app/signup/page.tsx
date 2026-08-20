"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserCheck, AlertCircle, Building } from "lucide-react";
import { useAuth, User } from "../../lib/auth";
import { TransitionLink, useRouteTransition } from "../../components/RouteTransitionProvider";

export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const { navigateTo } = useRouteTransition();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<User["role"]>("Security Analyst");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigateTo("/dashboard");
    }
  }, [isAuthenticated, navigateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError("Please enter your name and email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signup(name, email, org, role);
      navigateTo("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10100D] text-bone flex items-center justify-center p-6 selection:bg-[#34332D] selection:text-white font-sans">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="space-y-2 text-center sm:text-left">
          <TransitionLink href="/" className="inline-flex items-center space-x-2 group">
            <span className="font-mono text-xs font-bold tracking-[0.2em] text-bone uppercase">
              MODEL X-RAY
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-bone-dim px-1.5 py-0.5 border border-[#282722]">
              ENROLL
            </span>
          </TransitionLink>
          <h1 className="text-3xl font-serif font-light tracking-tight text-bone sm:text-4xl pt-1">
            Register Analyst Console
          </h1>
          <p className="text-xs font-mono text-bone-dim">
            Provision access to the Model X-Ray steganalysis engine.
          </p>
        </div>

        {/* Main Card */}
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
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Elena Vance"
                className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 px-3.5 text-xs text-bone placeholder-bone-dim focus:border-bone focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-bone-dim">
                Organization / Lab
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-bone-dim absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="AI Defense Lab"
                  className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone placeholder-bone-dim focus:border-bone focus:outline-none transition-colors"
                />
              </div>
            </div>

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
                  placeholder="elena@defense.ai"
                  className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone placeholder-bone-dim focus:border-bone focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-bone-dim">
                Assigned Role
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-bone-dim absolute left-3.5 top-3" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as User["role"])}
                  className="w-full border border-[#282722] bg-[#0E0E0B] py-2.5 pl-10 pr-3.5 text-xs text-bone focus:border-bone focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="ML Engineer">ML Engineer</option>
                  <option value="SecOps Lead">SecOps Lead</option>
                  <option value="Auditor">Compliance Auditor</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-invert-primary w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 text-xs font-mono font-semibold uppercase tracking-wider"
            >
              <span>{loading ? "Registering..." : "Create Account →"}</span>
            </button>
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="text-center font-mono text-xs text-bone-dim">
          <span>Already registered? </span>
          <TransitionLink href="/login" className="text-bone hover:underline ml-1">
            Sign In →
          </TransitionLink>
        </div>
      </div>
    </div>
  );
}
