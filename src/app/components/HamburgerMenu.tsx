"use client";

interface HamburgerMenuProps {
  onClick: () => void;
  isOpen?: boolean;
}

export default function HamburgerMenu({
  onClick,
  isOpen = false,
}: HamburgerMenuProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded hover:bg-white/10 transition-all duration-200 ease-in-out"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <div className="w-5 h-5 flex flex-col justify-center items-center">
        <span
          className={`block w-4 h-0.5 bg-white transition-all duration-300 ${
            isOpen ? "rotate-45 translate-y-1" : ""
          }`}
        />
        <span
          className={`block w-4 h-0.5 bg-white my-1 transition-all duration-300 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-4 h-0.5 bg-white transition-all duration-300 ${
            isOpen ? "-rotate-45 -translate-y-1" : ""
          }`}
        />
      </div>
    </button>
  );
}
