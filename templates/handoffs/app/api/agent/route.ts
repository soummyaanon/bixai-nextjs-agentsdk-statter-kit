import { APIConnectionError, APIError } from "openai";
import { ZodError } from "zod";
import {
  AgentRunInputSchema,
  normalizeAgentOutput,
  runAgent,
  runAgentStream,
} from "@/runtime/agentRunner";

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };

  return Response.json(body, { status });
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON_BODY");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorChain(error: unknown): unknown[] {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const chain: unknown[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) {
      continue;
    }

    seen.add(current);
    chain.push(current);

    if (isRecord(current)) {
      if ("cause" in current) {
        queue.push(current.cause);
      }
      if ("error" in current) {
        queue.push(current.error);
      }
      if ("originalError" in current) {
        queue.push(current.originalError);
      }
    }
  }

  return chain;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
}

function getApiError(error: unknown): APIError | null {
  const chain = toErrorChain(error);
  for (const item of chain) {
    if (item instanceof APIError) {
      return item;
    }
  }
  return null;
}

function getDevDetails(error: unknown): Record<string, unknown> | undefined {
  if (!isDev) {
    return undefined;
  }

  const apiError = getApiError(error);
  const message = getErrorMessage(error);
  const details: Record<string, unknown> = {
    message,
  };

  if (error instanceof Error) {
    details.name = error.name;
  }

  if (apiError) {
    details.openai = {
      status: apiError.status,
      code: apiError.code,
      type: apiError.type,
      param: apiError.param,
      requestID: apiError.requestID,
      message: apiError.message,
    };
  }

  return details;
}

function handleRouteError(error: unknown): Response {
  if (error instanceof ZodError) {
    return createErrorResponse(
      400,
      "invalid_request_body",
      "Request body failed validation.",
      error.flatten(),
    );
  }

  if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
    return createErrorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON.",
    );
  }

  if (
    error instanceof Error &&
    error.message.includes("OPENAI_API_KEY is not configured")
  ) {
    return createErrorResponse(
      500,
      "server_misconfigured",
      "OPENAI_API_KEY is not configured on the server.",
      getDevDetails(error),
    );
  }

  if (error instanceof APIConnectionError) {
    return createErrorResponse(
      502,
      "openai_connection_error",
      "Unable to reach OpenAI API. Check network and retry.",
      getDevDetails(error),
    );
  }

  if (error instanceof APIError) {
    if (error.status === 401) {
      return createErrorResponse(
        401,
        "openai_auth_error",
        "OpenAI authentication failed. Verify OPENAI_API_KEY in .env.local.",
        getDevDetails(error),
      );
    }

    if (error.status === 429) {
      return createErrorResponse(
        429,
        "openai_rate_limited",
        "OpenAI rate limit exceeded. Retry after a short delay.",
        getDevDetails(error),
      );
    }

    if (
      error.status === 404 &&
      (error.code === "model_not_found" || error.message.toLowerCase().includes("model"))
    ) {
      return createErrorResponse(
        500,
        "model_configuration_error",
        "Configured model is unavailable. Check OPENAI_MODEL or account model access.",
        getDevDetails(error),
      );
    }

    return createErrorResponse(
      502,
      "openai_upstream_error",
      "OpenAI API request failed.",
      getDevDetails(error),
    );
  }

  const nestedApiError = getApiError(error);
  if (nestedApiError) {
    return handleRouteError(nestedApiError);
  }

  console.error("Agent route failed:", error);

  return createErrorResponse(
    500,
    "agent_run_failed",
    "Agent execution failed unexpectedly.",
    getDevDetails(error),
  );
}

function createSseResponse(
  streamedResult: Awaited<ReturnType<typeof runAgentStream>>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      sendEvent("ready", { ok: true });

      try {
        for await (const event of streamedResult) {
          if (event.type === "agent_updated_stream_event") {
            sendEvent("agent", { name: event.agent.name });
          } else if (event.type === "raw_model_stream_event") {
            const data = event.data as Record<string, unknown>;
            if (data.type === "output_text_delta") {
              sendEvent("text_delta", {
                delta: (data as { delta: string }).delta,
              });
            }
          } else if (event.type === "run_item_stream_event") {
            if (event.name === "tool_called") {
              const rawItem = event.item.rawItem as {
                type: string;
                callId?: string;
                name?: string;
                arguments?: string;
              };
              if (rawItem.type === "function_call") {
                let args: unknown = rawItem.arguments;
                try {
                  args = JSON.parse(rawItem.arguments ?? "{}");
                } catch {
                  // keep as string
                }
                sendEvent("tool_call", {
                  callId: rawItem.callId,
                  name: rawItem.name,
                  arguments: args,
                });
              }
            } else if (event.name === "tool_output") {
              const item = event.item as {
                rawItem?: { callId?: string };
                output?: unknown;
              };
              sendEvent("tool_output", {
                callId: item.rawItem?.callId,
                output: item.output,
              });
            }
          }
        }

        await streamedResult.completed;

        sendEvent("done", {
          output: normalizeAgentOutput(streamedResult.finalOutput),
          responseId: streamedResult.lastResponseId ?? null,
        });
      } catch (error) {
        sendEvent("error", {
          message:
            error instanceof Error
              ? error.message
              : "An unknown streaming error occurred.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export function GET(): Response {
  return Response.json({
    service: "agent-template",
    routes: {
      run: {
        method: "POST",
        path: "/api/agent",
      },
      stream: {
        method: "POST",
        path: "/api/agent?stream=true",
      },
    },
    requestBody: {
      message: "string (required)",
      conversationId: "string (optional)",
      maxTurns: "number 1-20 (optional)",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const stream = new URL(request.url).searchParams.get("stream") === "true";

  try {
    const rawBody = await parseJsonBody(request);
    const parsedBody = AgentRunInputSchema.parse(rawBody);

    if (stream) {
      const streamedResult = await runAgentStream(parsedBody, {
        signal: request.signal,
      });
      return createSseResponse(streamedResult);
    }

    const result = await runAgent(parsedBody, { signal: request.signal });
    return Response.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
