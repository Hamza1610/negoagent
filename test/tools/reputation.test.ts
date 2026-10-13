import { describe, it, expect } from "vitest";
import {
  reputationToolSchemas,
  formatReputationScore,
} from "../../src/tools/reputation";

describe("Reputation Tool (TDD Unit Tests)", () => {
  it("should format reputation score and decimals accurately", () => {
    // 100 with 0 decimals = 100
    const score1 = formatReputationScore(100, 0);
    expect(score1).toBe(100);

    // 85 with 1 decimal = 8.5
    const score2 = formatReputationScore(85, 1);
    expect(score2).toBe(8.5);

    // -50 with 0 decimals = -50
    const score3 = formatReputationScore(-50, 0);
    expect(score3).toBe(-50);
  });

  it("should provide valid OpenAI function tool schemas for reputation", () => {
    expect(reputationToolSchemas).toHaveLength(2);
    const toolNames = reputationToolSchemas.map((t) => t.function.name);
    expect(toolNames).toContain("submit_reputation_feedback");
    expect(toolNames).toContain("get_reputation_summary");

    const feedbackTool = reputationToolSchemas.find(
      (t) => t.function.name === "submit_reputation_feedback"
    );
    expect(feedbackTool?.function.parameters.required).toContain("targetAgentId");
    expect(feedbackTool?.function.parameters.required).toContain("value");
    expect(feedbackTool?.function.parameters.required).toContain("tag1");

    const summaryTool = reputationToolSchemas.find(
      (t) => t.function.name === "get_reputation_summary"
    );
    expect(summaryTool?.function.parameters.required).toContain("agentId");
  });
});
