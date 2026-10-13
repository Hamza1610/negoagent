import fs from "fs";
import path from "path";
import { StorageAdapter } from "./adapter";
import { AgentProfile, SessionRecord, TranscriptMessage } from "./types";

const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: "agent_buyer_alpha",
    name: "Alpha ProcureBot (Buyer)",
    role: "BUYER",
    strategy: "concessionist",
    targetPrice: "7.0",
    reservationPrice: "8.5",
    referencePrice: "10.0",
    avatar: "bot-cyan",
    walletAddress: "0x23ee7225F978a99A3a94C11242811deBA369318F",
    createdAt: 1728830000000,
  },
  {
    id: "agent_seller_beta",
    name: "Beta ProviderBot (Seller)",
    role: "SELLER",
    strategy: "balanced",
    targetPrice: "9.5",
    reservationPrice: "7.8",
    referencePrice: "10.0",
    avatar: "bot-magenta",
    walletAddress: "0xDf09e28c592771819cD8F4dE9590097292d18F84",
    createdAt: 1728830000000,
  },
  {
    id: "agent_buyer_apex",
    name: "Apex Arbitrage (Buyer)",
    role: "BUYER",
    strategy: "aggressive",
    targetPrice: "6.0",
    reservationPrice: "7.5",
    referencePrice: "10.0",
    avatar: "bot-amber",
    walletAddress: "0x23ee7225F978a99A3a94C11242811deBA369318F",
    createdAt: 1728830000000,
  },
];

export class LocalFileAdapter implements StorageAdapter {
  private dataDir: string;
  private agentsFile: string;
  private sessionsFile: string;
  private transcriptsFile: string;

  constructor(customDir?: string) {
    this.dataDir = customDir || path.resolve(process.cwd(), "data");
    this.agentsFile = path.join(this.dataDir, "agents.json");
    this.sessionsFile = path.join(this.dataDir, "sessions.json");
    this.transcriptsFile = path.join(this.dataDir, "transcripts.json");

    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.agentsFile)) {
      fs.writeFileSync(this.agentsFile, JSON.stringify(DEFAULT_AGENTS, null, 2));
    }

    if (!fs.existsSync(this.sessionsFile)) {
      fs.writeFileSync(this.sessionsFile, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(this.transcriptsFile)) {
      fs.writeFileSync(this.transcriptsFile, JSON.stringify({}, null, 2));
    }
  }

  private readJson<T>(filePath: string): T {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data) as T;
    } catch {
      return [] as unknown as T;
    }
  }

  private writeJson<T>(filePath: string, data: T): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async getAgents(): Promise<AgentProfile[]> {
    return this.readJson<AgentProfile[]>(this.agentsFile);
  }

  async getAgentById(id: string): Promise<AgentProfile | null> {
    const agents = await this.getAgents();
    return agents.find((a) => a.id === id) || null;
  }

  async saveAgent(agent: AgentProfile): Promise<void> {
    const agents = await this.getAgents();
    const existingIndex = agents.findIndex((a) => a.id === agent.id);

    if (existingIndex >= 0) {
      agents[existingIndex] = agent;
    } else {
      agents.push(agent);
    }

    this.writeJson(this.agentsFile, agents);
  }

  async deleteAgent(id: string): Promise<void> {
    const agents = await this.getAgents();
    const filtered = agents.filter((a) => a.id !== id);
    this.writeJson(this.agentsFile, filtered);
  }

  async getSessions(): Promise<SessionRecord[]> {
    return this.readJson<SessionRecord[]>(this.sessionsFile);
  }

  async getSessionById(id: string): Promise<SessionRecord | null> {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === id) || null;
  }

  async saveSession(session: SessionRecord): Promise<void> {
    const sessions = await this.getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }

    this.writeJson(this.sessionsFile, sessions);
  }

  async getTranscripts(sessionId: string): Promise<TranscriptMessage[]> {
    const all = this.readJson<Record<string, TranscriptMessage[]>>(this.transcriptsFile);
    return all[sessionId] || [];
  }

  async appendMessage(sessionId: string, message: TranscriptMessage): Promise<void> {
    const all = this.readJson<Record<string, TranscriptMessage[]>>(this.transcriptsFile);
    if (!all[sessionId]) {
      all[sessionId] = [];
    }
    all[sessionId].push(message);
    this.writeJson(this.transcriptsFile, all);
  }
}
