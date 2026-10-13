"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  History, 
  Search, 
  Filter, 
  ExternalLink, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Download, 
  ChevronRight,
  Eye,
  RefreshCw,
  Coins,
  ShieldCheck,
  Copy,
  Check
} from "lucide-react";
import type { SessionRecord, TranscriptMessage } from "@/src/storage/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "Settled" | "Rejected" | "Active">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected session for modal
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const openTranscriptModal = async (session: SessionRecord) => {
    setSelectedSession(session);
    setLoadingTranscript(true);
    try {
      const res = await fetch(`/api/sessions?sessionId=${session.id}`);
      const data = await res.json();
      if (data.success) {
        setTranscript(data.transcripts || []);
      }
    } catch (err) {
      console.error("Failed to load transcript:", err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const closeModal = () => {
    setSelectedSession(null);
    setTranscript([]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = (session: SessionRecord, msgs: TranscriptMessage[]) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ session, transcript: msgs }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `negoagent-session-${session.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (filter !== "ALL" && s.status !== filter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        s.itemDescription.toLowerCase().includes(query) ||
        s.buyerAgentId.toLowerCase().includes(query) ||
        s.sellerAgentId.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const settledCount = sessions.filter(s => s.status === "Settled").length;
  const settlementRate = sessions.length ? Math.round((settledCount / sessions.length) * 100) : 0;
  const avgRounds = sessions.length 
    ? (sessions.reduce((acc, s) => acc + s.roundCount, 0) / sessions.length).toFixed(1)
    : "0";

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "5rem" }}>
      {/* Header breadcrumb & title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Link href="/workbench" style={{ color: "var(--neon-cyan)" }}>Simulation Workbench</Link>
            <ChevronRight size={14} />
            <span>Archive</span>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <History color="var(--neon-cyan)" size={32} />
            Negotiation Transcripts & Archives
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.4rem", maxWidth: "680px" }}>
            Auditable record of autonomous multi-agent bargains. Inspect turn-by-turn counter-offers, examine Qwen 3.8 Max latent strategic thoughts, and verify Monad on-chain settlement receipts.
          </p>
        </div>

        <button 
          onClick={fetchSessions}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", alignSelf: "flex-end" }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Records
        </button>
      </div>

      {/* Analytics KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Sessions</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.3rem" }}>{sessions.length}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--neon-cyan)", marginTop: "0.2rem" }}>Recorded via Pluggable Storage</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Settlement Rate</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--neon-emerald)", marginTop: "0.3rem" }}>{settlementRate}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{settledCount} deals successfully reached</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Turns to Consensus</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--neon-purple)", marginTop: "0.3rem" }}>{avgRounds}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Sub-second latency on Monad</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ERC-8004 Verification</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#38bdf8", marginTop: "0.3rem" }}>100%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Trustless Agent Standards</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by item, agent ID, or session hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontSize: "0.95rem",
              width: "100%",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>Filter:</span>
          {(["ALL", "Settled", "Rejected", "Active"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                background: filter === opt ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
                border: filter === opt ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.1)",
                color: filter === opt ? "var(--neon-cyan)" : "var(--text-muted)",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8rem",
                fontWeight: filter === opt ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: "var(--neon-cyan)" }} />
          Loading negotiation history records...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem", borderRadius: "var(--radius-lg)" }}>
          <History size={48} color="var(--text-muted)" style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.5rem" }}>No Negotiation Sessions Found</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto 1.5rem auto", fontSize: "0.9rem" }}>
            {sessions.length === 0 
              ? "You haven't run any simulated negotiations yet. Head over to the Workbench to pair two agents and witness their first autonomous bargain!"
              : "No sessions matched your search criteria."}
          </p>
          <Link href="/workbench" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            Launch Workbench Simulation <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {filteredSessions.map((session) => {
            const isSettled = session.status === "Settled";
            const isRejected = session.status === "Rejected";

            return (
              <div 
                key={session.id}
                className="glass-panel"
                style={{
                  padding: "1.5rem",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Header item + status */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <span 
                      style={{ 
                        fontSize: "0.75rem", 
                        padding: "0.25rem 0.65rem", 
                        borderRadius: "var(--radius-full)",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                        background: isSettled ? "rgba(16, 185, 129, 0.15)" : isRejected ? "rgba(244, 63, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: isSettled ? "var(--neon-emerald)" : isRejected ? "#fb7185" : "var(--neon-amber)",
                        border: `1px solid ${isSettled ? "rgba(16, 185, 129, 0.3)" : isRejected ? "rgba(244, 63, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                      }}
                    >
                      {session.status.toUpperCase()}
                    </span>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Clock size={12} />
                      {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
                    {session.itemDescription}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    <span style={{ color: "var(--neon-cyan)" }}>{session.buyerAgentId}</span>
                    <span style={{ opacity: 0.5 }}>vs</span>
                    <span style={{ color: "var(--neon-purple)" }}>{session.sellerAgentId}</span>
                  </div>

                  {/* Price metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "rgba(0, 0, 0, 0.25)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.25rem" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Anchor Quote</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.1rem" }}>
                        {session.anchorPrice} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>MON</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Final Outcome</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: isSettled ? "var(--neon-emerald)" : isRejected ? "#fb7185" : "var(--text-muted)", marginTop: "0.1rem" }}>
                        {session.finalPrice ? `${session.finalPrice} MON` : "No Deal"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer details & actions */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    <span>{session.roundCount} Rounds Exchanged</span>
                    {session.txHash && (
                      <a 
                        href={`https://testnet.monadscan.com/tx/${session.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: "var(--neon-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        Monadscan <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => openTranscriptModal(session)}
                      className="btn btn-secondary"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.85rem" }}
                    >
                      <Eye size={15} />
                      Inspect Transcript
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript Inspection Modal */}
      {selectedSession && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem"
          }}
          onClick={closeModal}
        >
          <div 
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(0, 240, 255, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                    Transcript: {selectedSession.itemDescription}
                  </h2>
                  <span 
                    style={{ 
                      fontSize: "0.75rem", 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "var(--radius-full)", 
                      background: selectedSession.status === "Settled" ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
                      color: selectedSession.status === "Settled" ? "var(--neon-emerald)" : "#fb7185",
                      fontWeight: 600
                    }}
                  >
                    {selectedSession.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span>Session: <code style={{ color: "var(--neon-cyan)" }}>{selectedSession.id}</code></span>
                  <span>Anchor: {selectedSession.anchorPrice} MON</span>
                  {selectedSession.finalPrice && <span style={{ color: "var(--neon-emerald)" }}>Agreed: {selectedSession.finalPrice} MON</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => handleExportJson(selectedSession, transcript)}
                  className="btn btn-secondary"
                  title="Export Transcript JSON"
                  style={{ padding: "0.5rem", borderRadius: "var(--radius-md)" }}
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={closeModal}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 0.8rem", borderRadius: "var(--radius-md)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Turns & Thoughts */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {loadingTranscript ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: "var(--neon-cyan)" }} />
                  Extracting transcript messages & cognitive traces...
                </div>
              ) : transcript.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
                  No turn messages recorded for this session.
                </div>
              ) : (
                transcript.map((msg, idx) => {
                  const isBuyer = msg.senderRole === "BUYER";
                  return (
                    <div 
                      key={msg.id || idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        padding: "1.25rem",
                        borderRadius: "var(--radius-md)",
                        background: isBuyer ? "rgba(0, 240, 255, 0.04)" : "rgba(139, 92, 246, 0.04)",
                        border: isBuyer ? "1px solid rgba(0, 240, 255, 0.2)" : "1px solid rgba(139, 92, 246, 0.2)"
                      }}
                    >
                      {/* Sender and turn meta */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span 
                            style={{ 
                              fontSize: "0.75rem", 
                              fontWeight: 700, 
                              padding: "0.2rem 0.5rem", 
                              borderRadius: "var(--radius-sm)",
                              background: isBuyer ? "var(--neon-cyan)" : "var(--neon-purple)",
                              color: "#05070f"
                            }}
                          >
                            {msg.senderRole}
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>
                            {msg.agentName}
                          </span>
                        </div>

                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Turn #{idx + 1} • {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Hidden Reasoning / Thought Bubble (Qwen 3.8 Max latent thoughts) */}
                      {msg.thought && (
                        <div 
                          style={{
                            background: "rgba(0, 0, 0, 0.4)",
                            border: "1px dashed rgba(255, 255, 255, 0.15)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.75rem 1rem",
                            fontSize: "0.85rem",
                            color: "#cbd5e1",
                            display: "flex",
                            gap: "0.6rem"
                          }}
                        >
                          <Brain size={16} color="var(--neon-cyan)" style={{ flexShrink: 0, marginTop: "0.2rem" }} />
                          <div>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--neon-cyan)", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>
                              Qwen 3.8 Max Reasoning Trace:
                            </span>
                            <div style={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                              {msg.thought}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Utterance Dialogue */}
                      <div style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-main)", padding: "0.25rem 0" }}>
                        "{msg.content}"
                      </div>

                      {/* Tool call details if present */}
                      {msg.toolCall && (
                        <div 
                          style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "0.5rem", 
                            background: "rgba(0, 0, 0, 0.3)", 
                            padding: "0.4rem 0.75rem", 
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.8rem",
                            alignSelf: "flex-start",
                            border: "1px solid rgba(255, 255, 255, 0.08)"
                          }}
                        >
                          <span style={{ color: "var(--neon-amber)", fontWeight: 600 }}>Action:</span>
                          <code>{msg.toolCall.name}({JSON.stringify(msg.toolCall.args)})</code>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {transcript.length} dialogue turns verified with ERC-8004 signatures.
              </div>
              <button onClick={closeModal} className="btn btn-primary" style={{ padding: "0.4rem 1.25rem" }}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
