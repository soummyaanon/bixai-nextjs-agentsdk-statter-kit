"use client";

import { ToolCallBlock } from "./ToolCallBlock";
import type { Message } from "@/lib/chatTypes";
import { COPPER_GRADIENT, MONO_FONT_FAMILY } from "@/lib/uiPrimitives";

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
          style={{
            background: COPPER_GRADIENT,
            color: "var(--copper-50)",
          }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {/* Agent label */}
        <div className="mb-1.5 flex items-center gap-2">
          <div
            className="h-1 w-1 rounded-full"
            style={{ background: "var(--copper-500)" }}
          />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{
              fontFamily: MONO_FONT_FAMILY,
              color: "var(--text-tertiary)",
            }}
          >
            Agent
          </span>
        </div>

        {message.toolCalls.map((tc) => (
          <ToolCallBlock key={tc.callId} toolCall={tc} />
        ))}

        {message.content && (
          <div
            className="rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <p className="whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span
                  className="streaming-cursor ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 rounded-sm"
                  style={{ background: "var(--copper-400)" }}
                />
              )}
            </p>
          </div>
        )}

        {!message.content && message.isStreaming && message.toolCalls.length === 0 && (
          <div
            className="rounded-2xl rounded-tl-sm border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-elevated)",
            }}
          >
            <span
              className="streaming-cursor inline-block h-4 w-[3px] translate-y-0.5 rounded-sm"
              style={{ background: "var(--copper-400)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
