"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  isLeftPanelModalOpen: boolean;
  setIsLeftPanelModalOpen: (open: boolean) => void;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [screenWidth, setScreenWidth] = useState(0);
  const [isLeftPanelModalOpen, setIsLeftPanelModalOpen] = useState(false);

  // Responsive breakpoints
  const isMobile = screenWidth < 800;
  const isTablet = screenWidth >= 800 && screenWidth < 1200;
  const isDesktop = screenWidth >= 1200;

  // Update screen width on resize
  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    return () => window.removeEventListener("resize", updateScreenWidth);
  }, []);

  return (
    <ResponsiveContext.Provider
      value={{
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        isLeftPanelModalOpen,
        setIsLeftPanelModalOpen,
      }}
    >
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error("useResponsive must be used within a ResponsiveProvider");
  }
  return context;
}
