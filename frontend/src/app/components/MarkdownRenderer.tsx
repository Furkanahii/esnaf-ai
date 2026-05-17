"use client";
import React from "react";

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let parsed: React.ReactNode = line;

    // Bold: **text**
    const boldParts = line.split(/\*\*(.*?)\*\*/g);
    if (boldParts.length > 1) {
      parsed = boldParts.map((part, j) =>
        j % 2 === 1 ? <strong key={`b-${i}-${j}`} className="font-semibold text-white">{part}</strong> : part
      );
    }

    // Italic: *text*
    if (typeof parsed === "string") {
      const italicParts = parsed.split(/\*(.*?)\*/g);
      if (italicParts.length > 1) {
        parsed = italicParts.map((part, j) =>
          j % 2 === 1 ? <em key={`i-${i}-${j}`} className="italic text-emerald-300/80">{part}</em> : part
        );
      }
    }

    nodes.push(
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {parsed}
      </React.Fragment>
    );
  });

  return nodes;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return <span className="text-[14.5px] leading-relaxed">{parseMarkdown(content)}</span>;
}
