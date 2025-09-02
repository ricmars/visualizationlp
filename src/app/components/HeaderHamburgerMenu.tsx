"use client";

import { useResponsive } from "../contexts/ResponsiveContext";
import HamburgerMenu from "./HamburgerMenu";
import { usePathname } from "next/navigation";

export default function HeaderHamburgerMenu() {
  const { isMobile, isLeftPanelModalOpen, setIsLeftPanelModalOpen } =
    useResponsive();
  const pathname = usePathname();

  // Only show hamburger menu on mobile and when on an application page
  if (!isMobile || !pathname.startsWith("/application/")) {
    return null;
  }

  return (
    <HamburgerMenu
      onClick={() => setIsLeftPanelModalOpen(!isLeftPanelModalOpen)}
      isOpen={isLeftPanelModalOpen}
    />
  );
}
