export interface AgentProfile {
  id: string;
  name: string;
  role: "BUYER" | "SELLER";
  strategy: "aggressive" | "cooperative" | "concessionist" | "balanced";
  targetPrice: string;
  reservationPrice: string;
  referencePrice: string;
  avatar: string;
  walletAddress: string;
  createdAt: number;
}

export interface SessionRecord {
  id: string;
  buyerAgentId: string;
  sellerAgentId: string;
  itemDescription: string;
  anchorPrice: string;
  finalPrice: string | null;
  status: "Settled" | "Rejected" | "Expired" | "Active";
  roundCount: number;
  txHash?: string;
  createdAt: number;
}

export interface TranscriptMessage {
  id: string;
  sessionId: string;
  senderRole: "BUYER" | "SELLER";
  agentName: string;
  content: string;
  thought?: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
  };
  txHash?: string;
  timestamp: number;
}
