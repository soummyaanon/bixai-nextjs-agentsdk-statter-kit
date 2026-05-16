import {
  MemorySession,
  Runner,
  type AgentInputItem,
  type Session,
} from "@openai/agents";
import { z } from "zod";
import { mainAgent } from "@/agents/main.agent";

export const AgentRunInputSchema = z
  .object({
    message: z.string().trim().min(1).max(4_000),
    conversationId: z.string().trim().min(1).max(128).optional(),
    maxTurns: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

export type AgentRunResponse = {
  output: string;
  responseId: string | null;
};

type SessionEntry = {
  session: Session;
  lastAccessedAt: number;
};

const OPENAI_CONVERSATION_ID_PATTERN = /^conv_[A-Za-z0-9_-]+$/;
const DEFAULT_LOCAL_SESSION_TTL_MS = 30 * 60 * 1_000;
const DEFAULT_MAX_LOCAL_SESSIONS = 200;

function readPositiveIntEnv(
  key: string,
  fallback: number,
  minimum = 1,
): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    return fallback;
  }

  return parsed;
}

const localSessionTtlMs = readPositiveIntEnv(
  "AGENT_LOCAL_SESSION_TTL_MS",
  DEFAULT_LOCAL_SESSION_TTL_MS,
  60_000,
);
const maxLocalSessions = readPositiveIntEnv(
  "AGENT_MAX_LOCAL_SESSIONS",
  DEFAULT_MAX_LOCAL_SESSIONS,
);

const runner = new Runner({
  tracingDisabled: process.env.AGENTS_TRACING_DISABLED === "true",
  traceIncludeSensitiveData:
    process.env.AGENTS_TRACE_INCLUDE_SENSITIVE_DATA === "true",
  workflowName: "agent-template-handoffs",
});
const sessionStore = new Map<string, SessionEntry>();

function assertApiKey(): void {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const placeholderValues = new Set([
    "",
    "your_key_here",
    "your_openai_api_key_here",
    "sk-your_key_here",
    "replace_me",
    "changeme",
  ]);

  if (!apiKey || placeholderValues.has(apiKey.toLowerCase())) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

function parseInput(rawInput: unknown): AgentRunInput {
  return AgentRunInputSchema.parse(rawInput);
}

function isOpenAIConversationId(value: string): boolean {
  return OPENAI_CONVERSATION_ID_PATTERN.test(value);
}

function pruneSessionStore(now: number): void {
  for (const [conversationId, entry] of sessionStore) {
    if (now - entry.lastAccessedAt > localSessionTtlMs) {
      sessionStore.delete(conversationId);
    }
  }

  if (sessionStore.size <= maxLocalSessions) {
    return;
  }

  const oldestFirst = [...sessionStore.entries()].sort(
    (left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt,
  );
  const overflow = sessionStore.size - maxLocalSessions;

  for (let index = 0; index < overflow; index += 1) {
    const entry = oldestFirst[index];
    if (!entry) {
      break;
    }
    sessionStore.delete(entry[0]);
  }
}

function isReasoningItem(item: AgentInputItem): boolean {
  return (item as { type?: string }).type === "reasoning";
}

/**
 * Wraps a MemorySession to strip ONLY trailing orphan reasoning items.
 * The Responses API requires each message item to be accompanied by the
 * reasoning item it references; stripping reasoning wholesale produces
 * "msg ... was provided without its required 'reasoning' item" 400s.
 * Trailing reasoning with no following message (e.g. from an interrupted
 * run) is still unsafe to replay, so we drop just that tail.
 */
class FilteredMemorySession implements Session {
  private inner: MemorySession;

  constructor() {
    this.inner = new MemorySession();
  }

  getSessionId() {
    return this.inner.getSessionId();
  }

  async getItems(limit?: number) {
    const items = await this.inner.getItems();
    let endIndex = items.length;
    while (endIndex > 0 && isReasoningItem(items[endIndex - 1]!)) {
      endIndex -= 1;
    }
    const filtered = endIndex === items.length ? items : items.slice(0, endIndex);

    if (limit === undefined) {
      return filtered;
    }

    if (limit <= 0) {
      return [];
    }

    return filtered.slice(-limit);
  }

  addItems(items: Parameters<Session["addItems"]>[0]) {
    return this.inner.addItems(items);
  }

  popItem() {
    return this.inner.popItem();
  }

  clearSession() {
    return this.inner.clearSession();
  }
}

function getOrCreateLocalSession(conversationId: string): Session {
  const now = Date.now();
  pruneSessionStore(now);

  const existingEntry = sessionStore.get(conversationId);
  if (existingEntry) {
    existingEntry.lastAccessedAt = now;
    return existingEntry.session;
  }

  const newSession = new FilteredMemorySession();
  sessionStore.set(conversationId, {
    session: newSession,
    lastAccessedAt: now,
  });
  pruneSessionStore(now);

  return newSession;
}

function resolveConversationContext(conversationId?: string): {
  conversationId?: string;
  session?: Session;
} {
  if (!conversationId) {
    return {};
  }

  if (isOpenAIConversationId(conversationId)) {
    return { conversationId };
  }

  return { session: getOrCreateLocalSession(conversationId) };
}

export function normalizeAgentOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }

  if (output === undefined || output === null) {
    return "";
  }

  return JSON.stringify(output);
}

export async function runAgent(
  rawInput: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<AgentRunResponse> {
  assertApiKey();
  const input = parseInput(rawInput);
  const conversationContext = resolveConversationContext(input.conversationId);

  const result = await runner.run(mainAgent, input.message, {
    ...conversationContext,
    maxTurns: input.maxTurns,
    signal: options.signal,
  });

  return {
    output: normalizeAgentOutput(result.finalOutput),
    responseId: result.lastResponseId ?? null,
  };
}

export async function runAgentStream(
  rawInput: unknown,
  options: { signal?: AbortSignal } = {},
) {
  assertApiKey();
  const input = parseInput(rawInput);
  const conversationContext = resolveConversationContext(input.conversationId);

  return runner.run(mainAgent, input.message, {
    ...conversationContext,
    maxTurns: input.maxTurns,
    signal: options.signal,
    stream: true,
  });
}
