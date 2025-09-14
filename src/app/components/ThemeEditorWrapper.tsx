"use client";

import React, { Suspense } from "react";
import { DefaultTheme } from "styled-components";

// Separate the props interface so it can be used by both components
export type ThemeEditorProps = {
  theme: DefaultTheme;
  name: string;
  onUpdate: (theme: DefaultTheme) => void;
};

// Lazy load the actual implementation
const ThemeEditorImpl = React.lazy(() => import("./ThemeEditorImpl"));

// Create a wrapper component that handles the lazy loading
const ThemeEditorWrapper: React.FC<ThemeEditorProps> = (props) => {
  return (
    <Suspense fallback={<div>Loading theme editor...</div>}>
      <ThemeEditorImpl {...props} />
    </Suspense>
  );
};

export default ThemeEditorWrapper;
