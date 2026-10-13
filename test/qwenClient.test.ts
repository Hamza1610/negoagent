import { describe, it, expect } from "vitest";
import {
  getAllAgentTools,
  buildAgentSystemPrompt,
  parseToolCallArguments,
} from "../src/qwenClient";

describe("Qwen 3.8 Max Client & Prompt Engine (TDD Unit Tests)", () => {
  it("should compile all 8 required tools into OpenAI function calling format", () => {
    const tools = getAllAgentTools();
    expect(tools.length).toBeGreaterThanOrEqual(8);

    const toolNames = tools.map((t) => t.function.name);
    expect(toolNames).toContain("register_agent");
    expect(toolNames).toContain("get_agent_identity");
    expect(toolNames).toContain("open_negotiation");
    expect(toolNames).toContain("make_offer");
    expect(toolNames).toContain("accept_offer");
    expect(toolNames).toContain("reject_offer");
    expect(toolNames).toContain("get_negotiation_state");
    expect(toolNames).toContain("submit_reputation_feedback");
    expect(toolNames).toContain("get_reputation_summary");
  });

  it("should construct role-specific system prompt for BUYER agent", () => {
    const prompt = buildAgentSystemPrompt({
      role: "BUYER",
      agentName: "NEGOagent-Buyer-01",
      agentId: 1,
      targetPrice: "7.0",
      reservationPrice: "8.5",
      referencePrice: "10.0",
      itemDescription: "Decentralized RPC Node Subscription",
    });

    expect(prompt).toContain("BUYER");
    expect(prompt).toContain("NEGOagent-Buyer-01");
    expect(prompt).toContain("8.5");
    expect(prompt.toLowerCase()).toContain("reservation price");
    expect(prompt).toContain("ERC-8004");
  });

  it("should construct role-specific system prompt for SELLER agent", () => {
    const prompt = buildAgentSystemPrompt({
      role: "SELLER",
      agentName: "NEGOagent-Seller-01",
      agentId: 2,
      targetPrice: "9.5",
      reservationPrice: "7.8",
      referencePrice: "10.0",
      itemDescription: "Decentralized RPC Node Subscription",
    });

    expect(prompt).toContain("SELLER");
    expect(prompt).toContain("NEGOagent-Seller-01");
    expect(prompt.toLowerCase()).toContain("floor price");
    expect(prompt).toContain("7.8");
  });

  it("should safely parse tool call arguments from JSON string", () => {
    const args = parseToolCallArguments('{"negotiationId": 1, "amount": "8.0"}');
    expect(args).toEqual({ negotiationId: 1, amount: "8.0" });

    const fallback = parseToolCallArguments("invalid json");
    expect(fallback).toEqual({});
  });
});
