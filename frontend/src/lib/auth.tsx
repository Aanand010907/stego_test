"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "SecOps Lead" | "ML Engineer" | "Security Analyst" | "Auditor";
  organization: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: User["role"]) => Promise<void>;
  signup: (name: string, email: string, org: string, role?: User["role"]) => Promise<void>;
  logout: () => void;
}

const DEMO_USER: User = {
  id: "usr_demo_secops",
  name: "Dr. Rachel Sterling",
  email: "secops.lead@enterprise.ai",
  role: "SecOps Lead",
  organization: "Enterprise AI Security Lab",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("model_xray_session");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to restore session from localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, role: User["role"] = "SecOps Lead") => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const newUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: email.split("@")[0].replace(".", " ").replace(/^\w/, (c) => c.toUpperCase()),
      email: email || DEMO_USER.email,
      role: role,
      organization: "AI Security Operations",
    };
    setUser(newUser);
    try {
      localStorage.setItem("model_xray_session", JSON.stringify(newUser));
    } catch (e) {}
    setIsLoading(false);
  };

  const signup = async (
    name: string,
    email: string,
    org: string,
    role: User["role"] = "Security Analyst"
  ) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const newUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name,
      email,
      role,
      organization: org || "Enterprise AI Lab",
    };
    setUser(newUser);
    try {
      localStorage.setItem("model_xray_session", JSON.stringify(newUser));
    } catch (e) {}
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("model_xray_session");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {},
      signup: async () => {},
      logout: () => {},
    };
  }
  return context;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#10100D] flex items-center justify-center text-bone-muted font-mono text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-bone animate-ping" />
          <span>VERIFYING SESSION...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
