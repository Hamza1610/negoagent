import { AgentProfile, SessionRecord, TranscriptMessage } from "./types";

export interface StorageAdapter {
  getAgents(): Promise<AgentProfile[]>;
  getAgentById(id: string): Promise<AgentProfile | null>;
  saveAgent(agent: AgentProfile): Promise<void>;
  deleteAgent(id: string): Promise<void>;

  getSessions(): Promise<SessionRecord[]>;
  getSessionById(id: string): Promise<SessionRecord | null>;
  saveSession(session: SessionRecord): Promise<void>;

  getTranscripts(sessionId: string): Promise<TranscriptMessage[]>;
  appendMessage(sessionId: string, message: TranscriptMessage): Promise<void>;
}
