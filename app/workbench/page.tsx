"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  CheckCircle2,
  BrainCircuit,
} from "lucide-react";

interface AgentProfile {
  id: string;
  name: string;
  role: "BUYER" | "SELLER";
  strategy: string;
  targetPrice: string;
  reservationPrice: string;
  referencePrice: string;
  avatar: string;
  walletAddress: string;
}

interface TranscriptMessage {
  id: string;
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

export default function WorkbenchArenaPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [buyerAgent, setBuyerAgent] = useState<AgentProfile | null>(null);
  const [sellerAgent, setSellerAgent] = useState<AgentProfile | null>(null);

  // Match parameters
  const [itemDescription, setItemDescription] = useState("Decentralized High-Throughput RPC Node Subscription");
  const [referencePrice, setReferencePrice] = useState("10.0");

  // Arena State
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState<"BUYER" | "SELLER">("BUYER");
  const [currentOffer, setCurrentOffer] = useState<string | null>(null);
  const [status, setStatus] = useState<"Created" | "Active" | "Settled">("Created");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [expandedThought, setExpandedThought] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.success && data.agents.length >= 2) {
          setAgents(data.agents);
          const buyer = data.agents.find((a: AgentProfile) => a.role === "BUYER") || data.agents[0];
          const seller = data.agents.find((a: AgentProfile) => a.role === "SELLER") || data.agents[1];
          setBuyerAgent(buyer);
          setSellerAgent(seller);
        }
      } catch (err) {
        console.error("Failed to load agents", err);
      }
    }
    loadAgents();
  }, []);

  const toggleThought = (id: string) => {
    setExpandedThought((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStep = async () => {
    if (!buyerAgent || !sellerAgent || status === "Settled" || loadingStep) return;

    setLoadingStep(true);
    const nextRound = turn === "BUYER" ? round + 1 : round;

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAgent,
          sellerAgent,
          itemDescription,
          referencePrice,
          currentRound: nextRound,
          history: messages,
          turn,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const newMsg: TranscriptMessage = data.message;
        setMessages((prev) => [...prev, newMsg]);
        setCurrentOffer(data.offerAmount);
        setRound(nextRound);
        setTurn(data.nextTurn);

        // Auto-expand latest thought
        setExpandedThought((prev) => ({ ...prev, [newMsg.id]: true }));

        if (data.isSettled) {
          setStatus("Settled");
          setAutoPlaying(false);

          // Archive session to database plugin
          fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session: {
                id: `session_${Date.now()}`,
                buyerAgentId: buyerAgent.id,
                sellerAgentId: sellerAgent.id,
                itemDescription,
                anchorPrice: referencePrice,
                finalPrice: data.offerAmount,
                status: "Settled",
                roundCount: nextRound,
                txHash: newMsg.txHash,
                createdAt: Date.now(),
              },
            }),
          }).catch(console.error);
        } else {
          setStatus("Active");
        }
      }
    } catch (err) {
      console.error("Step execution failed", err);
    } finally {
      setLoadingStep(false);
    }
  };

  const handleReset = () => {
    setRound(0);
    setTurn("BUYER");
    setCurrentOffer(null);
    setStatus("Created");
    setMessages([]);
    setAutoPlaying(false);
    setExpandedThought({});
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoPlaying && status !== "Settled" && !loadingStep) {
      timer = setTimeout(() => {
        handleStep();
      }, 1600);
    }
    return () => clearTimeout(timer);
  }, [autoPlaying, status, loadingStep, turn, round]);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "36px 20px" }}>
      {/* ARENA HEADER & CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: "6px" }}>Simulation Workbench Arena</div>
          <h1 style={{ fontSize: "2.2rem" }}>Tactical Negotiation Arena</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleStep}
            disabled={status === "Settled" || loadingStep || autoPlaying}
            className="btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.9rem" }}
          >
            <Play size={16} /> {loadingStep ? "Thinking..." : "Step Turn"}
          </button>

          <button
            onClick={() => setAutoPlaying(!autoPlaying)}
            disabled={status === "Settled"}
            className={autoPlaying ? "btn-secondary" : "btn-purple"}
            style={{ padding: "10px 18px", fontSize: "0.9rem" }}
          >
            <Sparkles size={16} /> {autoPlaying ? "Pause" : "Auto-Play Match"}
          </button>

          <button onClick={handleReset} className="btn-secondary" style={{ padding: "10px 14px" }} title="Reset Arena">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* MATCHMAKING AGENT CARDS (SPLIT-SCREEN CONFRONTATION) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "20px",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        {/* BUYER CARD (LEFT) */}
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            borderLeft: "4px solid var(--cyan-primary)",
            background: "linear-gradient(135deg, rgba(0, 242, 254, 0.05), var(--bg-glass))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(0, 242, 254, 0.15)",
                  color: "var(--cyan-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={22} />
              </div>
              <div>
                <div className="badge badge-cyan" style={{ fontSize: "0.68rem", padding: "2px 8px" }}>BUYER</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>{buyerAgent?.name}</div>
              </div>
            </div>
            <select
              value={buyerAgent?.id}
              onChange={(e) => setBuyerAgent(agents.find((a) => a.id === e.target.value) || null)}
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "0.8rem",
              }}
            >
              {agents.filter((a) => a.role === "BUYER").map((a) => (
                <option key={a.id} value={a.id} style={{ background: "#0e1117" }}>{a.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <div>Strategy: <strong style={{ color: "#fff", textTransform: "capitalize" }}>{buyerAgent?.strategy}</strong></div>
            <div>Max Budget: <strong style={{ color: "var(--cyan-primary)" }}>{buyerAgent?.reservationPrice} MON</strong></div>
            <div>Target: <strong style={{ color: "var(--emerald-primary)" }}>{buyerAgent?.targetPrice} MON</strong></div>
          </div>
        </div>

        {/* VS BADGE */}
        <div style={{ textAlign: "center", padding: "0 8px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-medium)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            VS
          </div>
        </div>

        {/* SELLER CARD (RIGHT) */}
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            borderRight: "4px solid var(--purple-primary)",
            background: "linear-gradient(225deg, rgba(122, 90, 248, 0.05), var(--bg-glass))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(122, 90, 248, 0.15)",
                  color: "var(--purple-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={22} />
              </div>
              <div>
                <div className="badge badge-purple" style={{ fontSize: "0.68rem", padding: "2px 8px" }}>SELLER</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>{sellerAgent?.name}</div>
              </div>
            </div>
            <select
              value={sellerAgent?.id}
              onChange={(e) => setSellerAgent(agents.find((a) => a.id === e.target.value) || null)}
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "0.8rem",
              }}
            >
              {agents.filter((a) => a.role === "SELLER").map((a) => (
                <option key={a.id} value={a.id} style={{ background: "#0e1117" }}>{a.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <div>Strategy: <strong style={{ color: "#fff", textTransform: "capitalize" }}>{sellerAgent?.strategy}</strong></div>
            <div>Min Floor: <strong style={{ color: "var(--magenta-primary)" }}>{sellerAgent?.reservationPrice} MON</strong></div>
            <div>Target: <strong style={{ color: "var(--emerald-primary)" }}>{sellerAgent?.targetPrice} MON</strong></div>
          </div>
        </div>
      </div>

      {/* STATE & ROUND BANNER */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>ITEM UNDER NEGOTIATION</span>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{itemDescription}</span>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>ANCHOR PRICE</span>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{referencePrice} MON</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>ROUND</span>
            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>Round {round}</span>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>CURRENT OFFER</span>
            <span style={{ fontWeight: 800, color: "var(--cyan-primary)", fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>
              {currentOffer ? `${currentOffer} MON` : "—"}
            </span>
          </div>

          <div className={status === "Settled" ? "badge badge-green" : status === "Active" ? "badge badge-cyan" : "badge badge-amber"}>
            {status}
          </div>
        </div>
      </div>

      {/* SETTLEMENT SUCCESS HERO (IF SETTLED) */}
      {status === "Settled" && (
        <div
          className="glass-panel"
          style={{
            padding: "24px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(0, 242, 254, 0.05))",
            borderColor: "rgba(16, 185, 129, 0.4)",
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                color: "var(--emerald-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", color: "var(--emerald-primary)", marginBottom: "4px" }}>
                Deal Successfully Settled at {currentOffer} MON!
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Atomic on-chain settlement executed on Monad. Reciprocal reputation feedback (+100) recorded to ERC-8004 Registry.
              </p>
            </div>
          </div>

          <Link href="/workbench/history" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            View in History Archive <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* CHAT TIMELINE WITH EXPANDABLE LLM THOUGHT INSPECTOR */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: "64px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <BrainCircuit size={48} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Bargaining Arena Idle
            </div>
            <p style={{ fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 20px" }}>
              Click <strong>"Step Turn"</strong> to execute the first move, or <strong>"Auto-Play Match"</strong> to watch the autonomous concession loop converge in real time.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isBuyerMsg = msg.senderRole === "BUYER";
            const isThoughtOpen = expandedThought[msg.id] ?? false;

            return (
              <div
                key={msg.id}
                className="glass-panel"
                style={{
                  padding: "20px 24px",
                  borderLeft: isBuyerMsg ? "4px solid var(--cyan-primary)" : "4px solid var(--purple-primary)",
                  background: isBuyerMsg ? "rgba(0, 242, 254, 0.02)" : "rgba(122, 90, 248, 0.02)",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: isBuyerMsg ? "var(--cyan-primary)" : "var(--purple-primary)",
                      }}
                    >
                      {msg.agentName}
                    </span>
                    <span className={isBuyerMsg ? "badge badge-cyan" : "badge badge-purple"} style={{ fontSize: "0.7rem", padding: "1px 8px" }}>
                      {msg.senderRole}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {msg.toolCall && (
                      <span className="badge badge-green" style={{ fontSize: "0.72rem" }}>
                        Tool: {msg.toolCall.name} ({msg.toolCall.args.amount ? `${msg.toolCall.args.amount} MON` : "Accept"})
                      </span>
                    )}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Turn #{idx + 1}
                    </span>
                  </div>
                </div>

                {/* Natural dialogue message */}
                <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)", marginBottom: "12px" }}>
                  {msg.content}
                </p>

                {/* LLM REASONING / THOUGHT INSPECTOR ACCORDION */}
                {msg.thought && (
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.5)",
                      border: "1px solid rgba(0, 242, 254, 0.2)",
                      borderRadius: "10px",
                      overflow: "hidden",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      onClick={() => toggleThought(msg.id)}
                      style={{
                        width: "100%",
                        background: "rgba(0, 242, 254, 0.04)",
                        border: "none",
                        padding: "8px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        color: "var(--cyan-primary)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <BrainCircuit size={14} /> LLM INTERNAL REASONING & CONCESSION MATH
                      </span>
                      {isThoughtOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isThoughtOpen && (
                      <div
                        style={{
                          padding: "12px 16px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                          lineHeight: 1.6,
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                          background: "rgba(5, 7, 12, 0.8)",
                        }}
                      >
                        <div style={{ color: "var(--cyan-primary)", opacity: 0.8, marginBottom: "4px" }}>
                          &gt; Tactical evaluation against reservation boundaries:
                        </div>
                        {msg.thought}
                      </div>
                    )}
                  </div>
                )}

                {/* Explorer Link */}
                {msg.txHash && (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <a
                      href={`https://testnet.monadscan.com/tx/${msg.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        textDecoration: "none",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Monadscan: {msg.txHash.substring(0, 10)}...{msg.txHash.substring(58)} <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
