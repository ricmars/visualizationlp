"use client";

import React from "react";

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-app-screen">
      <div className="animate-spin rounded-full h-12 w-12"></div>
    </div>
  );
}
