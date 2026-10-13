import { describe, it, expect, vi } from "vitest";
import { executeAgentTool, ToolExecutionContext } from "../src/agentLoop";

describe("Agent Tool Dispatcher & Execution Loop (TDD Unit Tests)", () => {
  it("should dispatch make_offer tool call to negotiation executor", async () => {
    const mockMakeOffer = vi.fn().mockResolvedValue({
      success: true,
      round: 1,
      txHash: "0x1234567890abcdef",
    });

    const mockWallet = { account: { address: "0x1111" } } as any;
    const mockPublic = {} as any;

    const mockCtx: Partial<ToolExecutionContext> = {
      walletClient: mockWallet,
      publicClient: mockPublic,
      negotiationTools: {
        makeOffer: mockMakeOffer,
        openNegotiation: vi.fn(),
        acceptOffer: vi.fn(),
        rejectOffer: vi.fn(),
        getNegotiationState: vi.fn(),
      } as any,
    };

    const result = await executeAgentTool(
      mockCtx as ToolExecutionContext,
      "make_offer",
      { negotiationId: 1, amount: "7.5" }
    );

    expect(mockMakeOffer).toHaveBeenCalledWith(mockWallet, mockPublic, {
      negotiationId: 1,
      amount: "7.5",
    });
    expect(result.success).toBe(true);
    expect(result.txHash).toBe("0x1234567890abcdef");
  });

  it("should dispatch accept_offer tool call to negotiation executor", async () => {
    const mockAccept = vi.fn().mockResolvedValue({
      success: true,
      txHash: "0xabcdef1234567890",
    });

    const mockWallet = { account: { address: "0x1111" } } as any;
    const mockPublic = {} as any;

    const mockCtx: Partial<ToolExecutionContext> = {
      walletClient: mockWallet,
      publicClient: mockPublic,
      negotiationTools: {
        acceptOffer: mockAccept,
      } as any,
    };

    const result = await executeAgentTool(
      mockCtx as ToolExecutionContext,
      "accept_offer",
      { negotiationId: 1 }
    );

    expect(mockAccept).toHaveBeenCalledWith(mockWallet, mockPublic, 1);
    expect(result.success).toBe(true);
  });

  it("should return an error object for unrecognized tool names", async () => {
    const mockCtx: Partial<ToolExecutionContext> = {};
    const result = await executeAgentTool(
      mockCtx as ToolExecutionContext,
      "non_existent_tool",
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool name");
  });
});
