import React, { useState, useEffect, useCallback } from "react";

interface Theme {
  id: number;
  name: string;
  description: string;
  isSystemTheme: boolean;
  applicationid: number;
  model: any;
}

interface ThemeDropdownProps {
  applicationId: number;
  selectedThemeId: number | null;
  onThemeSelect: (themeId: number | null) => void;
  disabled?: boolean;
}

function Menu({
  id,
  label,
  children,
  isOpen,
  setOpenMenuId,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpenMenuId]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 cursor-pointer select-none bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5"
        onClick={() => setOpenMenuId(isOpen ? null : id)}
      >
        <span className="truncate max-w-[220px]">{label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute mt-2 z-50 w-72 max-w-[80vw] bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg min-w-0">
          <div className="max-h-72 overflow-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({
  applicationId,
  selectedThemeId,
  onThemeSelect,
  disabled: _disabled = false,
}) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchThemes = useCallback(async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dynamic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getListOfThemes",
          params: { applicationid: applicationId },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }

      const data = await response.json();
      setThemes(data.data?.themes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch themes");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleThemeSelect = (themeId: number | null) => {
    onThemeSelect(themeId);
    setOpenMenuId(null);
  };

  // Refresh list when themes are created/updated/deleted elsewhere
  useEffect(() => {
    const handler = () => fetchThemes();
    window.addEventListener("theme-updated", handler as EventListener);
    return () => {
      window.removeEventListener("theme-updated", handler as EventListener);
    };
  }, [applicationId, fetchThemes]);

  return (
    <Menu
      id="theme"
      label="Theme"
      isOpen={openMenuId === "theme"}
      setOpenMenuId={setOpenMenuId}
    >
      {loading ? (
        <div className="px-4 py-2 text-sm text-white/70">Loading themes...</div>
      ) : error ? (
        <div className="px-4 py-2 text-sm text-red-400">Error: {error}</div>
      ) : themes.length === 0 ? (
        <div className="px-4 py-2 text-sm text-white/70">
          No themes available
        </div>
      ) : (
        <>
          {themes.map((theme) => (
            <div key={theme.id} className="flex items-center group">
              <button
                className={`flex-1 text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 ${
                  selectedThemeId === theme.id ? "bg-gray-800" : ""
                }`}
                onClick={() => {
                  handleThemeSelect(theme.id);
                }}
              >
                {selectedThemeId === theme.id && (
                  <svg
                    className="w-4 h-4 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span className="flex-1">{theme.name}</span>
                {theme.isSystemTheme && (
                  <span className="tag-secondary text-xs">System</span>
                )}
              </button>
            </div>
          ))}
        </>
      )}
    </Menu>
  );
};
