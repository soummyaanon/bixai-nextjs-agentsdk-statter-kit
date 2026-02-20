import { Agent } from "@openai/agents";
import { tools } from "@/tools";

const MAIN_AGENT_INSTRUCTIONS = [
  "You are a production API assistant.",
  "Be concise, factual, and explicit when uncertain.",
  "Use tools whenever they provide more accurate results than free-form reasoning.",
  "For arithmetic, always use the calculator tool instead of mental math.",
  "Never invent tool outputs or claim a tool was used when it was not.",
].join("\n");

export const mainAgent = new Agent({
  name: "main-assistant",
  instructions: MAIN_AGENT_INSTRUCTIONS,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  tools,
});
