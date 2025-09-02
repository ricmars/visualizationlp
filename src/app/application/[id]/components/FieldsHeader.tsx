"use client";

import React, { RefObject } from "react";

type FieldsHeaderProps = {
  onAddField: () => void;
  buttonRef?: RefObject<HTMLButtonElement>;
  count: number;
};

export default function FieldsHeader({
  onAddField,
  buttonRef,
  count,
}: FieldsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-white flex items-center">
        Fields <span className="ml-2 font-normal text-white">({count})</span>
      </h2>
      <button
        ref={buttonRef}
        onClick={onAddField}
        className="interactive-button"
      >
        Add Field
      </button>
    </div>
  );
}
