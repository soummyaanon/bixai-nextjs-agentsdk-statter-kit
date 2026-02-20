"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

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

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseSSE(chunk: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  const blocks = chunk.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) {
        event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        data = line.slice(6);
      }
    }
    if (event && data) {
      events.push({ event, data });
    }
  }
  return events;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId] = useState(() => `chat-${generateId()}`);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
        toolCalls: [],
        isStreaming: false,
      };

      const assistantId = generateId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent?stream=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errBody = await res.text();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${errBody}`, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE blocks (split by double newline)
          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const complete = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSE(complete);

          for (const { event, data } of events) {
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            switch (event) {
              case "text_delta": {
                const delta = parsed.delta as string;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + delta }
                      : m
                  )
                );
                break;
              }

              case "tool_call": {
                const tc: ToolCall = {
                  callId: parsed.callId as string,
                  name: parsed.name as string,
                  arguments: parsed.arguments as Record<string, unknown>,
                  status: "calling",
                };
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...m.toolCalls, tc] }
                      : m
                  )
                );
                break;
              }

              case "tool_output": {
                const callId = parsed.callId as string;
                const output = parsed.output;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: m.toolCalls.map((tc) =>
                            tc.callId === callId
                              ? { ...tc, output, status: "done" as const }
                              : tc
                          ),
                        }
                      : m
                  )
                );
                break;
              }

              case "done": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                  )
                );
                break;
              }

              case "error": {
                const errMsg = parsed.message as string;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: m.content + `\n\n[Error: ${errMsg}]`,
                          isStreaming: false,
                        }
                      : m
                  )
                );
                break;
              }
            }
          }
        }

        // Stream ended
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      m.content +
                      `\n\n[Connection error: ${(err as Error).message}]`,
                    isStreaming: false,
                  }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[#09090B]">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-xs font-medium tracking-wider text-zinc-400">
            AGENT
          </span>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-500">
                  <path d="M10 2L2 10l8 8 8-8-8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="10" cy="10" r="2" fill="currentColor"/>
                </svg>
              </div>
              <p className="text-sm text-zinc-500">
                Send a message to start a conversation
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
