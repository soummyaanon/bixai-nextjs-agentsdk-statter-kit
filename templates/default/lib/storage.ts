type ToolCall = {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: unknown;
  status: "calling" | "done";
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCall[];
  isStreaming: boolean;
};

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const CONVERSATIONS_KEY = "agent-conversations";
const CHAT_PREFIX = "agent-chat:";

export function getConversations(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationMeta[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversation(meta: ConversationMeta): void {
  try {
    const conversations = getConversations();
    const idx = conversations.findIndex((c) => c.id === meta.id);
    if (idx >= 0) {
      conversations[idx] = meta;
    } else {
      conversations.unshift(meta);
    }
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function deleteConversation(id: string): void {
  try {
    const conversations = getConversations().filter((c) => c.id !== id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    localStorage.removeItem(`${CHAT_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

export function getMessages(conversationId: string): Message[] {
  try {
    const raw = localStorage.getItem(`${CHAT_PREFIX}${conversationId}`);
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

export function saveMessages(conversationId: string, messages: Message[]): void {
  try {
    // Strip streaming state before persisting
    const cleaned = messages.map((m) => ({ ...m, isStreaming: false }));
    localStorage.setItem(`${CHAT_PREFIX}${conversationId}`, JSON.stringify(cleaned));
  } catch {
    // localStorage quota exceeded or unavailable
  }
}
