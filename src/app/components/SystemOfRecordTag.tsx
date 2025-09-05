"use client";

import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import the Pega Cosmos Icon component
const Icon = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
  { ssr: false },
);

type SystemOfRecordTagProps = {
  name: string;
  icon?: string | null;
};

// Utility function to check if a string is a URL
const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export default function SystemOfRecordTag({
  name,
  icon,
}: SystemOfRecordTagProps) {
  const renderIcon = () => {
    if (!icon) return null;

    if (isUrl(icon)) {
      // If it's a URL, render as an image
      return (
        <Image
          src={icon}
          alt={`${name} icon`}
          width={16}
          height={16}
          className="flex-shrink-0 h-4 w-auto"
        />
      );
    } else {
      // If it's an icon name, render as Pega Cosmos Icon
      return <Icon name={icon} className="flex-shrink-0 w-3 h-3" />;
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-md min-h-[1.5rem]">
      {renderIcon()}
      {!icon && <span className="leading-none">{name}</span>}
    </span>
  );
}
