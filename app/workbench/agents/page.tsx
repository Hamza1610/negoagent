"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Plus, Trash2, ArrowRight, ShieldCheck, Zap, UserPlus, X, Check } from "lucide-react";

interface AgentProfile {
  id: string;
  name: string;
  role: "BUYER" | "SELLER";
  strategy: "aggressive" | "cooperative" | "concessionist" | "balanced";
  targetPrice: string;
  reservationPrice: string;
  referencePrice: string;
  avatar: string;
  walletAddress: string;
}

export default function AgentsBoardPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [strategy, setStrategy] = useState<"aggressive" | "cooperative" | "concessionist" | "balanced">("balanced");
  const [targetPrice, setTargetPrice] = useState("7.0");
  const [reservationPrice, setReservationPrice] = useState("8.5");
  const [referencePrice, setReferencePrice] = useState("10.0");
  const [avatar, setAvatar] = useState("bot-cyan");

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (err) {
      console.error("Failed to load agents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          strategy,
          targetPrice,
          reservationPrice,
          referencePrice,
          avatar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgents((prev) => [...prev, data.agent]);
        setShowModal(false);
        setName("");
      }
    } catch (err) {
      console.error("Failed to create agent", err);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await fetch(`/api/agents?id=${id}`, { method: "DELETE" });
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete agent", err);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <div className="badge badge-purple" style={{ marginBottom: "8px" }}>Pluggable Storage Layer</div>
          <h1 style={{ fontSize: "2.4rem" }}>Agent Management Board</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            Create, name, and tune autonomous agents with custom negotiation strategies and reservation margins.
          </p>
        </div>

        <div style={{ display: "flex", gap: "14px" }}>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: "12px 20px" }}>
            <UserPlus size={18} /> Create Custom Agent
          </button>
          <Link href="/workbench" className="btn-secondary" style={{ padding: "12px 20px" }}>
            Enter Arena <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
          Loading agent profiles from database adapter...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {agents.map((agent) => {
            const isBuyer = agent.role === "BUYER";
            return (
              <div
                key={agent.id}
                className="glass-panel"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isBuyer ? "rgba(0, 242, 254, 0.2)" : "rgba(122, 90, 248, 0.25)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          background: isBuyer ? "rgba(0, 242, 254, 0.15)" : "rgba(122, 90, 248, 0.15)",
                          color: isBuyer ? "var(--cyan-primary)" : "var(--purple-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isBuyer ? "var(--glow-cyan)" : "var(--glow-purple)",
                        }}
                      >
                        <Bot size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{agent.name}</h3>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {agent.walletAddress.substring(0, 8)}...{agent.walletAddress.substring(36)}
                        </div>
                      </div>
                    </div>

                    <div className={isBuyer ? "badge badge-cyan" : "badge badge-purple"}>
                      {agent.role}
                    </div>
                  </div>

                  {/* Strategy & Thresholds */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "16px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Strategy:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-main)", textTransform: "capitalize" }}>
                        {agent.strategy}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Target Price:</span>
                      <div style={{ fontWeight: 700, color: "var(--emerald-primary)" }}>
                        {agent.targetPrice} MON
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isBuyer ? "Max Budget:" : "Min Floor:"}</span>
                      <div style={{ fontWeight: 700, color: isBuyer ? "var(--cyan-primary)" : "var(--magenta-primary)" }}>
                        {agent.reservationPrice} MON
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Baseline:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        {agent.referencePrice} MON
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ERC-8004 Compatible</span>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.8rem",
                    }}
                    title="Delete Agent"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE AGENT MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "32px",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.4rem" }}>Create Autonomous Agent</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Agent Name */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Agent Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Procurement Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: "0.95rem",
                  }}
                />
              </div>

              {/* Role Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Role in Negotiation
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRole("BUYER")}
                    className={role === "BUYER" ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "10px" }}
                  >
                    Buyer Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("SELLER")}
                    className={role === "SELLER" ? "btn-purple" : "btn-secondary"}
                    style={{ padding: "10px" }}
                  >
                    Seller Agent
                  </button>
                </div>
              </div>

              {/* Strategy Profile */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Bargaining Strategy
                </label>
                <select
                  value={strategy}
                  onChange={(e: any) => setStrategy(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="balanced" style={{ background: "#0e1117" }}>Balanced (Standard Concessions)</option>
                  <option value="aggressive" style={{ background: "#0e1117" }}>Aggressive (Slow Concessions, High Margin)</option>
                  <option value="cooperative" style={{ background: "#0e1117" }}>Cooperative (Rapid Convergence)</option>
                  <option value="concessionist" style={{ background: "#0e1117" }}>Concessionist (Smooth Midpoint Target)</option>
                </select>
              </div>

              {/* Price Thresholds */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Target Goal (MON)
                  </label>
                  <input
                    type="text"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "#fff",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    {role === "BUYER" ? "Max Ceiling (MON)" : "Min Floor (MON)"}
                  </label>
                  <input
                    type="text"
                    value={reservationPrice}
                    onChange={(e) => setReservationPrice(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "#fff",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} /> Save to Database Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
