"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link, { LinkProps } from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { AsciiBackground } from "./AsciiBackground";
import { LiquidShaderMask } from "./LiquidShaderMask";

interface TransitionContextType {
  navigateWithMask: (href: string) => void;
  navigateTo: (href: string) => void;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function AsciiMaskTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  const handleComplete = useCallback(() => {
    setIsTransitioning(false);
    setTargetRoute(null);
    setShowBadge(false);
  }, []);

  const navigateWithMask = useCallback(
    (href: string) => {
      if (href === pathname || isTransitioning) return;

      setIsTransitioning(true);
      setTargetRoute(href);
      setShowBadge(true);

      // Push router while covered by WebGL black shader & ASCII texture
      setTimeout(() => {
        router.push(href);
      }, 100);

      // Hide badge before liquid expansion reaches mid-screen
      setTimeout(() => {
        setShowBadge(false);
      }, 350);
    },
    [pathname, isTransitioning, router]
  );

  // Bind global keyboard navigation (ArrowLeft / ArrowRight)
  useKeyboardNav(navigateWithMask);

  return (
    <TransitionContext.Provider
      value={{
        navigateWithMask,
        navigateTo: navigateWithMask,
        isTransitioning,
      }}
    >
      {/* Underlying Page Router */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0.98 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.98 }}
          transition={{ duration: 0.15 }}
          className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Full-Screen WebGL Liquid Mask + ASCII Background */}
      {isTransitioning && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden"
        >
          {/* Zero-DOM-Bloat Tileable ASCII Texture */}
          <AsciiBackground />

          {/* High-Performance Three.js Liquid Shader Mask (GSAP Driven) */}
          <LiquidShaderMask onComplete={handleComplete} />

          {/* Minimal Central Route Indicator */}
          {showBadge && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-[#FAFAFA] bg-[#0A0A0A] text-[#FAFAFA] px-6 py-3 font-mono text-xs font-bold tracking-[0.3em] uppercase z-[10000] shadow-2xl">
              ROUTE // {targetRoute ? targetRoute.replace("/", "") || "HOME" : "TRANSITION"}
            </div>
          )}
        </div>
      )}
    </TransitionContext.Provider>
  );
}

export function useTransitionNav() {
  const context = useContext(TransitionContext);
  const router = useRouter();

  if (!context) {
    return {
      navigateWithMask: (href: string) => router.push(href),
      navigateTo: (href: string) => router.push(href),
      isTransitioning: false,
    };
  }

  return context;
}

export function TransitionLink({
  href,
  children,
  className,
  onClick,
  ...rest
}: LinkProps & {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { navigateWithMask } = useTransitionNav();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && typeof href === "string" && !href.startsWith("#") && !href.startsWith("http")) {
      e.preventDefault();
      navigateWithMask(href);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </Link>
  );
}