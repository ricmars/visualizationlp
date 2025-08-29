"use client";

import React from "react";

type ChatPanelTabsProps = {
  active: "chat" | "history";
  onChange: (tab: "chat" | "history") => void;
};

export default function ChatPanelTabs({
  active,
  onChange,
}: ChatPanelTabsProps) {
  return (
    <div>
      <div className="flex">
        <button
          onClick={() => onChange("chat")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            active === "chat"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => onChange("history")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            active === "history"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          History
        </button>
      </div>
    </div>
  );
}
