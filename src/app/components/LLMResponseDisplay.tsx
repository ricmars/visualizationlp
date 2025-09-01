import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// Function to format content based on its type - copied from ChatInterface
function normalizeMarkdown(original: string): string {
  let content = original;
  // Hide completion control markers from user display
  content = content.replace(/^\s*\[\[COMPLETED\]\]\s*\n?/i, "");
  // Also remove any inline occurrences of the marker while preserving line breaks
  content = content.replace(/[ \t]*\[\[COMPLETED\]\][ \t]*/gi, "");
  // Normalize line endings to \n
  content = content.replace(/\r\n?/g, "\n");
  // Normalize headings and colon/bullet variants in one pass
  // Matches line starts like: "Analyze", "Reasoning", "Plan", "Next Action"
  // with optional leading bullet and optional trailing colon
  // Remove any empty heading lines like "#" or "##" with no text
  content = content.replace(/(^|\n)\s*#{1,6}\s*(?=\n|$)/g, "$1");
  // Ensure headings start at the beginning of a line with a blank line before
  content = content.replace(/([^\n])\s*(#{1,6})\s+/g, (match, prev, hashes) => {
    return `${prev}\n\n${hashes} `;
  });

  // Ensure unordered list markers start on a new line
  content = content.replace(/([^\n])\s*([\-*+]\s+)/g, (match, prev, marker) => {
    return `${prev}\n${marker}`;
  });

  // Ensure ordered list markers like "1. " start on a new line
  content = content.replace(/([^\n])\s*(\d+\.\s+)/g, (match, prev, marker) => {
    return `${prev}\n${marker}`;
  });

  // Add missing space after unordered list markers at line start: "*Item" -> "* Item"
  content = content.replace(
    /(^|\n)([\-*+])(?!\s|[\-*+])/g,
    (match, start, marker) => {
      return `${start}${marker} `;
    },
  );

  // Add missing space after ordered list markers at line start: "1.Item" -> "1. Item"
  content = content.replace(/(^|\n)(\d+\.)(?!\s)/g, (match, start, marker) => {
    return `${start}${marker} `;
  });

  // Normalize multiple consecutive spaces after list markers
  content = content.replace(
    /(^|\n)([\-*+]\s{2,})/g,
    (match, start) => `${start}* `,
  );

  // Ensure a blank line between paragraphs when headings or lists follow text immediately
  content = content.replace(
    /([\S])\n(#{1,6}|[\-*+]\s|\d+\.\s)/g,
    (m, prev, next) => {
      return `${prev}\n\n${next}`;
    },
  );

  return content;
}

function formatContent(content: string): string {
  // Check if content is JSON
  try {
    const parsed = JSON.parse(content);
    // If it's a valid JSON object, format it as a code block
    return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
  } catch {
    // If it's not JSON, return as is (will be rendered as markdown)
    return normalizeMarkdown(content);
  }
}

interface LLMResponseDisplayProps {
  content: string;
  className?: string;
}

export const LLMResponseDisplay: React.FC<LLMResponseDisplayProps> = ({
  content,
  className = "",
}) => {
  const markdownComponents: Components = {
    p({ children }) {
      return <p style={{ wordBreak: "break-word" }}>{children}</p>;
    },
    h1({ children }) {
      const text = String(React.Children.toArray(children).join(" ")).trim();
      if (!text) return null;
      return (
        <h2 className="text-lg md:text-lg font-bold text-white mb-2 mt-3">
          {children}
        </h2>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-lg md:text-lg font-bold text-white mb-2 mt-3">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg md:text-xl font-bold text-white mb-2 mt-3">
          {children}
        </h3>
      );
    },
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      return isInline ? (
        <code
          className="bg-gray-800 px-1 py-0.5 rounded text-sm font-sans text-white"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </code>
      ) : (
        <pre
          className="bg-gray-800 p-2 rounded text-sm overflow-x-auto font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          <code
            className={className}
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            {children}
          </code>
        </pre>
      );
    },
    em({ children }) {
      return (
        <em
          className="italic font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </em>
      );
    },
    strong({ children }) {
      return (
        <strong
          className="font-bold font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </strong>
      );
    },
    pre({ children }) {
      return (
        <pre
          className="bg-gray-800 p-2 rounded text-sm overflow-x-auto font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </pre>
      );
    },
  };

  return (
    <div
      className={`prose prose-sm max-w-none font-sans text-white ${className}`}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={markdownComponents}
      >
        {formatContent(content)}
      </ReactMarkdown>
    </div>
  );
};
