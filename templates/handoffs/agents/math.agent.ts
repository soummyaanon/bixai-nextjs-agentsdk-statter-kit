import { Agent } from "@openai/agents";
import { calculatorTool } from "@/tools/calculator.tool";

const MATH_AGENT_INSTRUCTIONS = [
  "You are a math specialist. You only handle arithmetic and quantitative reasoning.",
  "Always use the calculator tool for any arithmetic — never compute mentally.",
  "Show the operation you ran and the result clearly.",
  "If the user's question is not about math, say so briefly so the orchestrator can re-route.",
].join("\n");

export const mathAgent = new Agent({
  name: "math-specialist",
  handoffDescription:
    "Handles arithmetic, calculations, and quantitative reasoning. Route any math or numeric question here.",
  instructions: MATH_AGENT_INSTRUCTIONS,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  tools: [calculatorTool],
});
