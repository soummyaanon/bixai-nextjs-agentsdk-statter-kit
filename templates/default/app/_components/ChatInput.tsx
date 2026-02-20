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
    <div className="border-t border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Send a message..."
          className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-700"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/80 text-white transition-colors hover:bg-red-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect width="14" height="14" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2L2 8.5l4.5 2L10 6l-3.5 4.5L9 14z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
