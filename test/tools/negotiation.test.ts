import { describe, it, expect } from "vitest";
import {
  negotiationToolSchemas,
  decodeNegotiationStatus,
  formatMonAmount,
  parseMonAmount,
} from "../../src/tools/negotiation";

describe("Negotiation Tool (TDD Unit Tests)", () => {
  it("should correctly decode numeric status to human-readable strings", () => {
    expect(decodeNegotiationStatus(0)).toBe("Created");
    expect(decodeNegotiationStatus(1)).toBe("Active");
    expect(decodeNegotiationStatus(2)).toBe("Accepted");
    expect(decodeNegotiationStatus(3)).toBe("Settled");
    expect(decodeNegotiationStatus(4)).toBe("Rejected");
    expect(decodeNegotiationStatus(5)).toBe("Expired");
    expect(decodeNegotiationStatus(99)).toBe("Unknown");
  });

  it("should convert MON string to wei BigInt and vice versa", () => {
    const wei = parseMonAmount("10.5");
    expect(wei).toBe(10500000000000000000n);

    const monStr = formatMonAmount(wei);
    expect(monStr).toBe("10.5");
  });

  it("should provide valid OpenAI function tool schemas for negotiation", () => {
    expect(negotiationToolSchemas.length).toBeGreaterThanOrEqual(5);

    const names = negotiationToolSchemas.map((t) => t.function.name);
    expect(names).toContain("open_negotiation");
    expect(names).toContain("make_offer");
    expect(names).toContain("accept_offer");
    expect(names).toContain("reject_offer");
    expect(names).toContain("get_negotiation_state");

    const makeOffer = negotiationToolSchemas.find((t) => t.function.name === "make_offer");
    expect(makeOffer?.function.parameters.required).toContain("negotiationId");
    expect(makeOffer?.function.parameters.required).toContain("amount");

    const acceptOffer = negotiationToolSchemas.find((t) => t.function.name === "accept_offer");
    expect(acceptOffer?.function.parameters.required).toContain("negotiationId");
  });
});
