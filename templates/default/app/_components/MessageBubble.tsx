"use client";

import { ToolCallBlock } from "./ToolCallBlock";

type ToolCall = {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  status: "calling" | "done";
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCall[];
  isStreaming: boolean;
};

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        {message.toolCalls.map((tc) => (
          <ToolCallBlock key={tc.callId} toolCall={tc} />
        ))}

        {message.content && (
          <div className="rounded-2xl rounded-bl-md bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200">
            <p className="whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span className="streaming-cursor ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-emerald-500" />
              )}
            </p>
          </div>
        )}

        {!message.content && message.isStreaming && message.toolCalls.length === 0 && (
          <div className="rounded-2xl rounded-bl-md bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200">
            <span className="streaming-cursor inline-block h-4 w-1.5 translate-y-0.5 bg-emerald-500" />
          </div>
        )}
      </div>
    </div>
  );
}
