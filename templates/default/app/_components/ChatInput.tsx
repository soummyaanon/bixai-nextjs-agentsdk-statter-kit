"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";

type ChatInputProps = {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
};

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const value = textareaRef.current?.value.trim();
    if (!value || isStreaming) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }, [onSend, isStreaming]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="relative z-10 px-5 py-4">
      <div className="mx-auto flex max-w-2xl items-end gap-3">
        <div
          className="flex flex-1 items-end rounded-xl border transition-all duration-300"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-tertiary)",
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Message..."
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:opacity-40"
            style={{
              fontFamily: "var(--font-syne), system-ui",
              color: "var(--text-primary)",
            }}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={isStreaming}
          />
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              borderColor: "#442222",
              background: "linear-gradient(135deg, #2a1010 0%, #1a0808 100%)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#cc4444">
              <rect width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              borderColor: "var(--copper-700)",
              background: "linear-gradient(135deg, var(--copper-700) 0%, var(--copper-600) 100%)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--copper-100)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      <div className="mx-auto mt-2 max-w-2xl">
        <p
          className="text-center text-[10px] tracking-wider"
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "var(--text-muted)",
          }}
        >
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
