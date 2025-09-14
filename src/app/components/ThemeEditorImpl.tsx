"use client";

import React, { useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { DefaultTheme } from "styled-components";

// Dynamic imports for Pega components to avoid SSR issues
import dynamic from "next/dynamic";
import { StyleSheetManager } from "styled-components";

const PegaConfiguration = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.Configuration,
    })),
  { ssr: false },
);

const PegaLiveLog = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.LiveLog })),
  { ssr: false },
);

const PegaPopoverManager = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.PopoverManager,
    })),
  { ssr: false },
);

const PegaToaster = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Toaster })),
  { ssr: false },
);

const PegaModalManager = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.ModalManager,
    })),
  { ssr: false },
);

// Import the ThemeEditor component
const ThemeEditor = dynamic(() => import("./ThemeEditor"), { ssr: false });

export type ThemeEditorProps = {
  theme: DefaultTheme;
  name: string;
  onUpdate: (theme: DefaultTheme) => void;
  readOnly?: boolean;
};

// Stable error boundary to avoid remounting the subtree on each render
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 ThemeEditor component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", backgroundColor: "lightcoral" }}>
          <h3>ThemeEditor Component Error</h3>
          <p>Error: {this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Stable provider composition to prevent duplicate style tags on re-renders
const PegaProviders = React.memo(
  ({
    container,
    children,
  }: {
    container: HTMLElement;
    children: React.ReactNode;
  }) => {
    const [theme, setTheme] = React.useState<any>(null);

    React.useEffect(() => {
      // Dynamically import the theme to avoid SSR issues
      import("@pega/cosmos-react-core").then(({ Bootes2025DarkTheme }) => {
        const importedTheme = Bootes2025DarkTheme;
        importedTheme.base["font-family"] = "Montserrat, Helvetica, sans-serif";
        setTheme(importedTheme);
      });
    }, []);

    if (!theme) {
      return <div>Loading...</div>;
    }

    return (
      <StyleSheetManager target={container}>
        <PegaConfiguration
          theme={theme}
          disableDefaultFontLoading
          styleSheetTarget={container}
          portalTarget={container}
        >
          <PegaLiveLog maxLength={50}>
            <PegaPopoverManager>
              <PegaToaster dismissAfter={5000}>
                <PegaModalManager>
                  {children as unknown as any}
                </PegaModalManager>
              </PegaToaster>
            </PegaPopoverManager>
          </PegaLiveLog>
        </PegaConfiguration>
      </StyleSheetManager>
    );
  },
);

const ThemeEditorImpl: React.FC<ThemeEditorProps> = ({
  theme,
  name,
  onUpdate,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const reactRootRef = useRef<any>(null);

  // Set up Shadow DOM and render ThemeEditor component inside it
  useEffect(() => {
    console.log(
      "🔧 ThemeEditor useEffect triggered, containerRef.current:",
      containerRef.current,
    );
    if (!containerRef.current) return;

    let shadowRoot: ShadowRoot;
    let shadowContainer: HTMLDivElement;

    // Create shadow root if it doesn't exist
    if (!shadowRootRef.current) {
      try {
        shadowRoot = containerRef.current.attachShadow({ mode: "open" });
        shadowRootRef.current = shadowRoot;
        console.log("🔧 Created new shadow root:", shadowRoot);
      } catch (_error) {
        // Shadow root already exists, use the existing one
        shadowRoot = containerRef.current.shadowRoot as ShadowRoot;
        shadowRootRef.current = shadowRoot;
        console.log("🔧 Reusing existing shadow root:", shadowRoot);
      }
    } else {
      shadowRoot = shadowRootRef.current;
      console.log("🔧 Using cached shadow root:", shadowRoot);
    }

    // Create or reuse container div inside shadow DOM
    shadowContainer = shadowRoot.querySelector(
      "div.shadow-container",
    ) as HTMLDivElement;
    if (!shadowContainer) {
      shadowContainer = document.createElement("div");
      shadowContainer.className = "shadow-container";
      shadowRoot.appendChild(shadowContainer);
      console.log("🔧 Created new shadow container:", shadowContainer);
    } else {
      console.log("🔧 Reusing existing shadow container:", shadowContainer);
    }

    // Simple CSS reset for ThemeEditor
    if (!shadowRoot.querySelector("style[data-shadow-reset]")) {
      const globalStyle = document.createElement("style");
      globalStyle.setAttribute("data-shadow-reset", "true");
      globalStyle.textContent = `
        /* Simple CSS reset for Shadow DOM */
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }

        /* Basic reset */
        * {
          box-sizing: border-box;
        }

        /* Make the theme editor container fill available space */
        .shadow-container {
          width: 100%;
          height: 100%;
          display:flex;
          padding:8px;

        }

        /* Style form elements */
        .shadow-container input,
        .shadow-container select,
        .shadow-container textarea {
          background-color: #1a1a1a;
          color: #ffffff;
          border: 1px solid #333;
        }

        .shadow-container input:focus,
        .shadow-container select:focus,
        .shadow-container textarea:focus {
          border-color: #007bff;
          outline: none;
        }


        /* Style tabs */
        .shadow-container [role="tablist"] {
          border-bottom: 1px solid #333;
        }

        .shadow-container [role="tab"] {
          color: #ccc;
          background: transparent;
        }

        .shadow-container [role="tab"][aria-selected="true"] {
          color: #fff;
          border-bottom: 2px solid #007bff;
        }
      `;

      shadowRoot.insertBefore(globalStyle, shadowRoot.firstChild);
      console.log("🔧 Added CSS reset to shadow root");
    }

    // Create React root inside shadow DOM if it doesn't exist
    if (!reactRootRef.current) {
      reactRootRef.current = createRoot(shadowContainer);
      console.log("🔧 Created new React root:", reactRootRef.current);
    } else {
      console.log("🔧 Reusing existing React root:", reactRootRef.current);
    }

    // Render the ThemeEditor component inside shadow DOM
    if (shadowRootRef.current && reactRootRef.current) {
      let content = null;
      if (shadowRootRef.current) {
        // Render content
        content = (
          <ErrorBoundary>
            <PegaProviders container={shadowContainer}>
              <ThemeEditor
                theme={theme}
                name={name}
                onUpdate={onUpdate}
                readOnly={readOnly}
              />
            </PegaProviders>
          </ErrorBoundary>
        );
      }

      reactRootRef.current.render(content);
      console.log("🔧 Pega ThemeEditor rendered in Shadow DOM");
    } else {
      console.log("🔧 Cannot render - missing reactRoot or shadowRoot");
    }

    // Cleanup: do not unmount to avoid dev StrictMode double-invoke clearing
    return () => {};
  }, [theme, name, onUpdate]);

  return <div ref={containerRef} style={{ position: "relative" }}></div>;
};

export default ThemeEditorImpl;
