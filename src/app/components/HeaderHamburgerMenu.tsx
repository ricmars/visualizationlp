"use client";

import { useResponsive } from "../contexts/ResponsiveContext";
import HamburgerMenu from "./HamburgerMenu";
import { usePathname } from "next/navigation";

export default function HeaderHamburgerMenu() {
  const { isMobile, isLeftPanelModalOpen, setIsLeftPanelModalOpen } =
    useResponsive();
  const pathname = usePathname();

  // Only show hamburger menu on mobile and when on a workflow page
  if (!isMobile || !pathname.startsWith("/workflow/")) {
    return null;
  }

  return (
    <HamburgerMenu
      onClick={() => setIsLeftPanelModalOpen(!isLeftPanelModalOpen)}
      isOpen={isLeftPanelModalOpen}
    />
  );
}
