// Entry point for the runtime. The handoffs template routes through a triage
// orchestrator that delegates to specialist agents (math, weather) via the
// Agents SDK's `handoffs` mechanism. The runner follows handoffs automatically.
export { triageAgent as mainAgent } from "@/agents/triage.agent";
