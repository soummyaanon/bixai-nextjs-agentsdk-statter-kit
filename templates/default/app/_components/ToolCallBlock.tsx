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
    <div className="tool-call-block my-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-zinc-800/50"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            toolCall.status === "calling"
              ? "animate-pulse bg-amber-500"
              : "bg-emerald-500"
          }`}
        />
        <span className="font-mono text-zinc-300">{toolCall.name}</span>
        <span className="ml-auto text-zinc-600">
          {collapsed ? "+" : "\u2212"}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t border-zinc-800 px-3 py-2 text-xs">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Arguments
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-950 p-2 font-mono text-emerald-400/90">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>

          {toolCall.output !== undefined && (
            <>
              <div className="mb-1 mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Result
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-950 p-2 font-mono text-emerald-300">
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
