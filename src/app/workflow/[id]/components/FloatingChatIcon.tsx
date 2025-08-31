"use client";

interface FloatingChatIconProps {
  onClick: () => void;
  hasUnreadMessages?: boolean;
}

export default function FloatingChatIcon({
  onClick,
  hasUnreadMessages = false,
}: FloatingChatIconProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onClick}
        className="relative bg-[rgb(14,10,42)] text-white p-4 rounded-full shadow-2xl border border-[rgb(172,117,240)] hover:bg-[rgb(20,15,50)] transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
        aria-label="Open chat"
      >
        {/* Chat icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* Unread indicator */}
        {hasUnreadMessages && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}

        {/* Pulse animation for attention */}
        <div className="absolute inset-0 rounded-full bg-[rgb(172,117,240)] opacity-20 animate-ping"></div>
      </button>
    </div>
  );
}
