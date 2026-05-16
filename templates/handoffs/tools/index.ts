// In the handoffs template each specialist agent owns its own tool set —
// the math agent imports `calculatorTool`, the weather agent imports
// `weatherTool`. The triage orchestrator has no tools of its own.
export { calculatorTool } from "@/tools/calculator.tool";
export { weatherTool } from "@/tools/weather.tool";
