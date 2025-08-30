"use client";

import React from "react";

type RulesCheckoutPanelProps = {
  caseId?: number;
};

export default function RulesCheckoutPanel({
  caseId,
}: RulesCheckoutPanelProps) {
  return (
    <div className="flex flex-col h-full text-white">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-base font-semibold">Rules Checkout</h3>
        {typeof caseId === "number" && (
          <div className="text-xs text-white/70 mt-1">Case #{caseId}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm">
        <p className="text-white/80">
          This panel will show the current rules checked out for this case and
          allow check-in/check-out operations.
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-white/10 p-3">
            <div className="font-medium">No rules checked out</div>
            <div className="text-xs text-white/70">
              Use the workflow editor to modify rules; they will appear here
              when checked out.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
