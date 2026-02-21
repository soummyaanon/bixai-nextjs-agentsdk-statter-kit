import { Agent } from "@openai/agents";
import { tools } from "@/tools";

const MAIN_AGENT_INSTRUCTIONS = [
  "You are a helpful, concise assistant.",
  "Use tools whenever they provide more accurate results than free-form reasoning.",
  "For arithmetic and math questions, always use the calculator tool instead of mental math.",
  "For weather questions, always use the weather tool to get current conditions.",
  "Never invent tool outputs or claim a tool was used when it was not.",
  "Keep responses clear and to the point.",
].join("\n");

export const mainAgent = new Agent({
  name: "main-assistant",
  instructions: MAIN_AGENT_INSTRUCTIONS,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  tools,
});
