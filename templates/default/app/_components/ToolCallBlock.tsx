"use client";

import { useState } from "react";

type ToolCall = {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  status: "calling" | "done";
};

export function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="tool-call-block my-2 overflow-hidden rounded-lg border"
      style={{
        borderColor: toolCall.status === "calling" ? "var(--copper-700)" : "var(--border-default)",
        background: "var(--bg-secondary)",
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
        style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            toolCall.status === "calling" ? "status-pulse" : ""
          }`}
          style={{
            background:
              toolCall.status === "calling"
                ? "var(--copper-400)"
                : "var(--copper-600)",
          }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {toolCall.name}
        </span>
        <span
          className="ml-auto text-[10px] uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {toolCall.status === "calling" ? "running" : collapsed ? "show" : "hide"}
        </span>
      </button>

      {!collapsed && (
        <div
          className="px-3 py-2.5 text-xs"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div
            className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.2em]"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "var(--text-muted)",
            }}
          >
            Input
          </div>
          <pre
            className="overflow-x-auto whitespace-pre-wrap break-all rounded-md p-2.5 text-[11px] leading-relaxed"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              background: "var(--bg-primary)",
              color: "var(--copper-200)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>

          {toolCall.output !== undefined && (
            <>
              <div
                className="mb-1.5 mt-3 text-[9px] font-medium uppercase tracking-[0.2em]"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--text-muted)",
                }}
              >
                Output
              </div>
              <pre
                className="overflow-x-auto whitespace-pre-wrap break-all rounded-md p-2.5 text-[11px] leading-relaxed"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  background: "var(--bg-primary)",
                  color: "var(--copper-100)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {typeof toolCall.output === "string"
                  ? toolCall.output
                  : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
