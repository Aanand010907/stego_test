"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export const APP_ROUTES = [
  "/",
  "/features",
  "/faq",
  "/dashboard",
  "/scan",
];

export function useKeyboardNav(onNavigate?: (href: string) => void) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in form controls
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const currentIndex = APP_ROUTES.indexOf(pathname);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % APP_ROUTES.length;
        const nextRoute = APP_ROUTES[nextIndex];
        if (onNavigate) {
          onNavigate(nextRoute);
        } else {
          router.push(nextRoute);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const currentIndex = APP_ROUTES.indexOf(pathname);
        const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + APP_ROUTES.length) % APP_ROUTES.length;
        const prevRoute = APP_ROUTES[prevIndex];
        if (onNavigate) {
          onNavigate(prevRoute);
        } else {
          router.push(prevRoute);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router, onNavigate]);

  return {
    routes: APP_ROUTES,
    currentPath: pathname,
    currentIndex: APP_ROUTES.indexOf(pathname),
  };
}
