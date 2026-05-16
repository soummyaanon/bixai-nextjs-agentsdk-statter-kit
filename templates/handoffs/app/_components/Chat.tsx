"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Sidebar } from "./Sidebar";
import {
  getConversations,
  saveConversation,
  deleteConversation,
  getMessages,
  saveMessages,
  type ConversationMeta,
} from "@/lib/storage";
import type { Message, ToolCall } from "@/lib/chatTypes";
import { DISPLAY_FONT_FAMILY, MONO_FONT_FAMILY } from "@/lib/uiPrimitives";

function generateId() {
  return crypto.randomUUID();
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
  const [conversationId, setConversationId] = useState(() => `chat-${generateId()}`);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = messages.some((m) => m.isStreaming);

  // Load conversations from localStorage on mount
  useEffect(() => {
    setConversations(getConversations());
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Persist messages when they change (debounced by streaming state)
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      saveMessages(conversationId, messages);
    }
  }, [messages, isStreaming, conversationId]);

  const handleNewChat = useCallback(() => {
    if (isStreaming) return;
    const newId = `chat-${generateId()}`;
    setConversationId(newId);
    setMessages([]);
    setActiveAgent(null);
  }, [isStreaming]);

  const handleSelectChat = useCallback((id: string) => {
    if (isStreaming) return;
    const loaded = getMessages(id);
    setConversationId(id);
    setMessages(loaded);
    setActiveAgent(null);
  }, [isStreaming]);

  const handleDeleteChat = useCallback(
    (id: string) => {
      if (isStreaming) return;
      deleteConversation(id);
      setConversations(getConversations());
      if (id === conversationId) {
        const remaining = getConversations();
        if (remaining.length > 0) {
          const first = remaining[0];
          setConversationId(first.id);
          setMessages(getMessages(first.id));
        } else {
          handleNewChat();
        }
      }
    },
    [conversationId, handleNewChat, isStreaming]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;
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

      // Save/update conversation meta
      const now = Date.now();
      const existing = conversations.find((c) => c.id === conversationId);
      const title = existing?.title || text.slice(0, 40);
      saveConversation({
        id: conversationId,
        title,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      setConversations(getConversations());

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
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

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
              case "agent": {
                const name = parsed.name;
                if (typeof name === "string" && name.length > 0) {
                  setActiveAgent(name);
                }
                break;
              }

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
        abortRef.current = null;
        // Update timestamp
        const meta = getConversations().find((c) => c.id === conversationId);
        if (meta) {
          saveConversation({ ...meta, updatedAt: Date.now() });
          setConversations(getConversations());
        }
      }
    },
    [conversationId, conversations, isStreaming]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="ambient-bg flex h-screen">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={conversationId}
          isStreaming={isStreaming}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header
          className="relative z-10 flex items-center px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-3 flex items-center justify-center rounded-lg p-1.5 transition-colors duration-150"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div
              className="status-pulse h-2 w-2 rounded-full"
              style={{ background: "var(--copper-400)" }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{
                fontFamily: MONO_FONT_FAMILY,
                color: "var(--text-secondary)",
              }}
              title={activeAgent ? `Active agent: ${activeAgent}` : undefined}
            >
              {activeAgent ?? "Agent"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div
              className="h-1 w-1 rounded-full"
              style={{ background: "var(--text-muted)" }}
            />
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{
                fontFamily: MONO_FONT_FAMILY,
                color: "var(--text-muted)",
              }}
            >
              {messages.length > 0 ? `${messages.length} msgs` : "Ready"}
            </span>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-5 py-8"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.length === 0 && (
              <div className="relative flex flex-col items-center justify-center py-28 text-center">
                <div
                  aria-hidden
                  className="mb-3 select-none text-[clamp(2.5rem,10vw,4.8rem)] font-extrabold uppercase leading-none tracking-[0.14em]"
                  style={{
                    fontFamily: MONO_FONT_FAMILY,
                    color: "transparent",
                    WebkitTextStroke: "1px var(--border-default)",
                    opacity: 0.55,
                  }}
                >
                  bixai.dev
                </div>
                <h2
                  className="mb-3 text-2xl font-bold tracking-tight"
                  style={{
                    fontFamily: DISPLAY_FONT_FAMILY,
                    color: "var(--text-primary)",
                  }}
                >
                  What can I help with?
                </h2>
                <p
                  className="mb-3 text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    fontFamily: MONO_FONT_FAMILY,
                    color: "var(--text-muted)",
                  }}
                >
                  Built with bixai.dev
                </p>
                <p
                  className="max-w-xs text-sm leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Send a message to begin. I can reason, calculate, check the
                  weather, and work through problems step by step.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className="message-enter" style={{ animationDelay: `${Math.min(i * 0.03, 0.15)}s` }}>
                <MessageBubble message={msg} />
              </div>
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
    </div>
  );
}
