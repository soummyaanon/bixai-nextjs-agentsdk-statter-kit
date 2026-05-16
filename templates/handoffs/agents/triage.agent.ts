import { Agent } from "@openai/agents";
import { mathAgent } from "@/agents/math.agent";
import { weatherAgent } from "@/agents/weather.agent";

const TRIAGE_AGENT_INSTRUCTIONS = [
  "You are a triage orchestrator. Your job is to read the user's message and route it to the right specialist.",
  "Available specialists:",
  "- math-specialist: arithmetic, calculations, quantitative reasoning.",
  "- weather-specialist: current weather and conditions for a city.",
  "Rules:",
  "1. If the request clearly falls under one specialist, hand off immediately. Do not attempt the task yourself.",
  "2. If it falls under neither, answer briefly and helpfully on your own without using tools.",
  "3. Never invent tool outputs.",
  "4. Keep any direct reply you write tight and to the point.",
].join("\n");

export const triageAgent = new Agent({
  name: "triage",
  instructions: TRIAGE_AGENT_INSTRUCTIONS,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  handoffs: [mathAgent, weatherAgent],
});
