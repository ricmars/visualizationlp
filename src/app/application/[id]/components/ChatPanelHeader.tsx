"use client";

import React from "react";
import { FaMagic } from "react-icons/fa";
import dynamic from "next/dynamic";

const Icon = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
  { ssr: false },
);

type ChatPanelHeaderProps = {
  onQuickAction: () => void;
  onClearChat: () => void;
  additionalButtons?: React.ReactNode;
};

export default function ChatPanelHeader({
  onQuickAction,
  onClearChat,
  additionalButtons,
}: ChatPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 chat-header-bg">
      <div className="flex items-center gap-2">
        <div className="ai-icon">
          <Icon name="polaris-solid" size="s" color="#FFF" />
        </div>
        <h3 className="text-lg font-lg text-white">AI Assistant</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onQuickAction}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300"
        >
          <FaMagic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClearChat}
          className="px-3 py-1 text-xs text-white rounded-lg border border-gray-200"
        >
          Clear All
        </button>
        {additionalButtons}
      </div>
    </div>
  );
}
