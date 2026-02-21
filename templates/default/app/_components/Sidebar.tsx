"use client";

import { useMemo } from "react";
import type { ConversationMeta } from "@/lib/storage";

type SidebarProps = {
  conversations: ConversationMeta[];
  activeId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
};

function groupByTime(conversations: ConversationMeta[]) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups: { label: string; items: ConversationMeta[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of conversations) {
    const t = conv.updatedAt;
    if (t >= todayStart.getTime()) {
      groups[0].items.push(conv);
    } else if (t >= yesterdayStart.getTime()) {
      groups[1].items.push(conv);
    } else if (t >= weekStart.getTime()) {
      groups[2].items.push(conv);
    } else {
      groups[3].items.push(conv);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: SidebarProps) {
  const groups = useMemo(() => groupByTime(conversations), [conversations]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className="flex h-full w-[280px] shrink-0 flex-col border-r"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-sm font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-syne), system-ui",
              color: "var(--text-primary)",
            }}
          >
            Chats
          </span>
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              background: "linear-gradient(135deg, var(--copper-700) 0%, var(--copper-600) 100%)",
              color: "var(--copper-100)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </button>
        </div>

        {/* Conversation list */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2">
          {groups.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p
                className="text-xs"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--text-muted)",
                }}
              >
                No conversations yet
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div
                className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--text-muted)",
                }}
              >
                {group.label}
              </div>

              {group.items.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <div
                    key={conv.id}
                    className="group relative mb-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChat(conv.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150"
                      style={{
                        background: isActive ? "var(--accent-glow-strong)" : "transparent",
                        borderLeft: isActive ? "2px solid var(--copper-500)" : "2px solid transparent",
                        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      <span className="flex-1 truncate text-[13px]">
                        {conv.title}
                      </span>
                      <span
                        className="shrink-0 text-[10px] group-hover:hidden"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          color: "var(--text-muted)",
                        }}
                      >
                        {relativeTime(conv.updatedAt)}
                      </span>
                    </button>

                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation?")) {
                          onDeleteChat(conv.id);
                        }
                      }}
                      className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded p-1 transition-colors group-hover:flex"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
