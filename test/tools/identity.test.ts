import { describe, it, expect, vi } from "vitest";
import {
  createAgentCardUri,
  parseAgentCardUri,
  AgentCard,
  identityToolSchemas,
} from "../../src/tools/identity";

describe("Identity Tool (TDD Unit Tests)", () => {
  const sampleCard: AgentCard = {
    name: "NEGOagent-Buyer-01",
    description: "Qwen 3.8 Max negotiation agent specialized in price discovery",
    version: "1.0.0",
    capabilities: ["negotiation", "offer", "accept", "reputation"],
    model: "qwen3.8-max",
  };

  it("should format AgentCard into a valid data URI", () => {
    const uri = createAgentCardUri(sampleCard);
    expect(uri).toContain("data:application/json;utf8,");
    expect(uri).toContain("NEGOagent-Buyer-01");
  });

  it("should parse an AgentCard from a data URI", () => {
    const uri = createAgentCardUri(sampleCard);
    const parsed = parseAgentCardUri(uri);
    expect(parsed.name).toBe("NEGOagent-Buyer-01");
    expect(parsed.model).toBe("qwen3.8-max");
    expect(parsed.capabilities).toContain("negotiation");
  });

  it("should provide valid OpenAI function tool schemas for identity", () => {
    expect(identityToolSchemas).toHaveLength(2);
    const toolNames = identityToolSchemas.map((t) => t.function.name);
    expect(toolNames).toContain("register_agent");
    expect(toolNames).toContain("get_agent_identity");

    const registerTool = identityToolSchemas.find(
      (t) => t.function.name === "register_agent"
    );
    expect(registerTool?.function.parameters.properties).toHaveProperty("name");
    expect(registerTool?.function.parameters.properties).toHaveProperty("description");
  });
});
