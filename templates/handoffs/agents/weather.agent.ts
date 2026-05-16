import { Agent } from "@openai/agents";
import { weatherTool } from "@/tools/weather.tool";

const WEATHER_AGENT_INSTRUCTIONS = [
  "You are a weather specialist. You only handle weather and current-conditions questions.",
  "Always use the weather tool to fetch live conditions — never guess.",
  "Report temperature, feels-like, humidity, wind, and conditions in a tight summary.",
  "If the user's question is not about weather, say so briefly so the orchestrator can re-route.",
].join("\n");

export const weatherAgent = new Agent({
  name: "weather-specialist",
  handoffDescription:
    "Handles questions about current weather and conditions for a city. Route weather-related questions here.",
  instructions: WEATHER_AGENT_INSTRUCTIONS,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  tools: [weatherTool],
});
