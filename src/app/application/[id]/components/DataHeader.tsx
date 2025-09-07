"use client";

import React from "react";

type DataHeaderProps = {
  onAddDataObjectAction: () => void;
  count: number;
};

export default function DataHeader({
  onAddDataObjectAction,
  count,
}: DataHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center">
        Data <span className="ml-2 font-normal text-white">({count})</span>
      </h2>
      <button onClick={onAddDataObjectAction} className="interactive-button">
        Add Data Object
      </button>
    </div>
  );
}
