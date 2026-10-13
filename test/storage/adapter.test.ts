import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { LocalFileAdapter } from "../../src/storage/localAdapter";
import { AgentProfile, SessionRecord, TranscriptMessage } from "../../src/storage/types";

describe("Pluggable Storage Layer (TDD Unit Tests)", () => {
  const testDataDir = path.resolve(process.cwd(), "test-data-storage");
  let adapter: LocalFileAdapter;

  beforeEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    adapter = new LocalFileAdapter(testDataDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it("should initialize default agent presets if storage is empty", async () => {
    const agents = await adapter.getAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);

    const buyer = agents.find((a) => a.role === "BUYER");
    const seller = agents.find((a) => a.role === "SELLER");
    expect(buyer).toBeDefined();
    expect(seller).toBeDefined();
    expect(buyer?.name).toBeDefined();
  });

  it("should save and retrieve a custom named agent", async () => {
    const customAgent: AgentProfile = {
      id: "agent_custom_01",
      name: "Apex Autonomous ProcureBot",
      role: "BUYER",
      strategy: "aggressive",
      targetPrice: "6.5",
      reservationPrice: "8.0",
      referencePrice: "10.0",
      avatar: "bot-cyan",
      walletAddress: "0x23ee7225F978a99A3a94C11242811deBA369318F",
      createdAt: Date.now(),
    };

    await adapter.saveAgent(customAgent);
    const retrieved = await adapter.getAgentById("agent_custom_01");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Apex Autonomous ProcureBot");
    expect(retrieved?.strategy).toBe("aggressive");
  });

  it("should save and retrieve negotiation sessions", async () => {
    const session: SessionRecord = {
      id: "session_test_101",
      buyerAgentId: "agent_custom_01",
      sellerAgentId: "agent_seller_02",
      itemDescription: "Decentralized High-Throughput RPC Node Subscription",
      anchorPrice: "10.0",
      finalPrice: "8.0",
      status: "Settled",
      roundCount: 4,
      txHash: "0x5109283ba87129ca0918392acbd019283719283eacf",
      createdAt: Date.now(),
    };

    await adapter.saveSession(session);
    const retrieved = await adapter.getSessionById("session_test_101");

    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe("Settled");
    expect(retrieved?.finalPrice).toBe("8.0");
  });

  it("should append and retrieve transcript messages with LLM thoughts", async () => {
    const message: TranscriptMessage = {
      id: "msg_001",
      sessionId: "session_test_101",
      senderRole: "BUYER",
      agentName: "Apex Autonomous ProcureBot",
      content: "Proposing initial offer of 7.0 MON.",
      thought: "Analyzing reference price 10 MON. Concession slope requires 7.0 MON start.",
      toolCall: { name: "make_offer", args: { negotiationId: 1, amount: "7.0" } },
      txHash: "0x7a31b4e9102c48d9823f92b0c98f71a0d31e98c76451ef9b20712f5a01bcde91",
      timestamp: Date.now(),
    };

    await adapter.appendMessage("session_test_101", message);
    const transcripts = await adapter.getTranscripts("session_test_101");

    expect(transcripts).toHaveLength(1);
    expect(transcripts[0].thought).toContain("Analyzing reference price");
    expect(transcripts[0].toolCall?.name).toBe("make_offer");
  });
});
