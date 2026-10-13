"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  BrainCircuit,
  Search,
  Plus,
  X,
  Download,
  Activity,
  Layers,
  Settings2,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal
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

export default function WorkbenchPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [paletteFilter, setPaletteFilter] = useState<"ALL" | "BUYER" | "SELLER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Deployed Nodes on the Canvas
  const [buyerNode, setBuyerNode] = useState<AgentProfile | null>(null);
  const [sellerNode, setSellerNode] = useState<AgentProfile | null>(null);

  // Node Canvas Coordinates
  const [buyerPos, setBuyerPos] = useState({ x: 60, y: 100 });
  const [sellerPos, setSellerPos] = useState({ x: 420, y: 100 });

  // Canvas Zoom State
  const [zoom, setZoom] = useState(1);

  // Inspector Collapsible State
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Dragging State
  const [draggingTarget, setDraggingTarget] = useState<"BUYER" | "SELLER" | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Negotiation Deal Config
  const [itemDescription, setItemDescription] = useState("Tier-1 Dedicated RPC Streaming Endpoint");
  const [referencePrice, setReferencePrice] = useState("10.0");

  // Simulation Runtime State
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState<"BUYER" | "SELLER">("BUYER");
  const [currentOffer, setCurrentOffer] = useState<string | null>(null);
  const [status, setStatus] = useState<"Idle" | "Negotiating" | "Settled" | "Failed">("Idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalTxHash, setFinalTxHash] = useState<string | null>(null);

  // New Custom Agent Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [newAgentStrategy, setNewAgentStrategy] = useState("balanced");
  const [newAgentTarget, setNewAgentTarget] = useState("6.5");
  const [newAgentReservation, setNewAgentReservation] = useState("8.5");

  // Load Seed / Stored Agents
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.success && data.agents?.length > 0) {
          setAgents(data.agents);
          const defaultBuyer = data.agents.find((a: AgentProfile) => a.role === "BUYER");
          const defaultSeller = data.agents.find((a: AgentProfile) => a.role === "SELLER");
          if (defaultBuyer) setBuyerNode(defaultBuyer);
          if (defaultSeller) setSellerNode(defaultSeller);
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
      }
    }
    loadAgents();
  }, []);

  // Node Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, target: "BUYER" | "SELLER") => {
    e.stopPropagation();
    setDraggingTarget(target);
    const pos = target === "BUYER" ? buyerPos : sellerPos;
    dragOffset.current = {
      x: e.clientX / zoom - pos.x,
      y: e.clientY / zoom - pos.y,
    };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingTarget || !canvasRef.current) return;
    const newX = Math.max(10, e.clientX / zoom - dragOffset.current.x);
    const newY = Math.max(10, e.clientY / zoom - dragOffset.current.y);

    if (draggingTarget === "BUYER") {
      setBuyerPos({ x: newX, y: newY });
    } else {
      setSellerPos({ x: newX, y: newY });
    }
  }, [draggingTarget, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggingTarget(null);
  }, []);

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.4, parseFloat((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, parseFloat((z - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoom(1);

  // Deploy an Agent from Palette to Canvas
  const deployToCanvas = (agent: AgentProfile) => {
    if (agent.role === "BUYER") {
      setBuyerNode(agent);
    } else {
      setSellerNode(agent);
    }
  };

  // Create Custom Agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: newAgentRole,
          strategy: newAgentStrategy,
          targetPrice: newAgentTarget,
          reservationPrice: newAgentReservation,
          referencePrice: referencePrice,
          avatar: newAgentRole === "BUYER" ? "🤖" : "🏢",
        }),
      });
      const data = await res.json();
      if (data.success && data.agent) {
        setAgents((prev) => [data.agent, ...prev]);
        deployToCanvas(data.agent);
        setShowCreateModal(false);
        setNewAgentName("");
      }
    } catch (err) {
      console.error("Failed to create agent:", err);
    }
  };

  // Run Step-by-Step Turn
  const executeNextTurn = async () => {
    if (!buyerNode || !sellerNode || isProcessing) return;

    setIsProcessing(true);
    setStatus("Negotiating");

    const nextTurn = round === 0 ? "BUYER" : turn;
    const currentRoundNum = round === 0 ? 1 : (nextTurn === "BUYER" ? round + 1 : round);

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAgent: buyerNode,
          sellerAgent: sellerNode,
          itemDescription,
          referencePrice,
          currentRound: currentRoundNum,
          history: transcript,
          turn: nextTurn,
        }),
      });

      const data = await res.json();

      if (data.success && data.message) {
        const msg: TranscriptMessage = data.message;
        setTranscript((prev) => [...prev, msg]);
        setRound(currentRoundNum);

        if (msg.toolCall?.name === "make_offer") {
          setCurrentOffer(msg.toolCall.args.amount);
          setTurn(nextTurn === "BUYER" ? "SELLER" : "BUYER");
        } else if (msg.toolCall?.name === "accept_offer") {
          setStatus("Settled");
          setFinalTxHash(msg.txHash || `0x${Math.random().toString(16).substring(2, 66)}`);
        } else if (msg.toolCall?.name === "reject_offer") {
          setStatus("Failed");
        }
      }
    } catch (err) {
      console.error("Turn execution error:", err);
      setStatus("Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Automated Multi-Turn Run
  const runFullSimulation = async () => {
    if (!buyerNode || !sellerNode || isProcessing) return;

    setRound(0);
    setTurn("BUYER");
    setCurrentOffer(null);
    setTranscript([]);
    setStatus("Negotiating");

    let currentTranscript: TranscriptMessage[] = [];
    let curTurn: "BUYER" | "SELLER" = "BUYER";
    let curRound = 1;
    let settled = false;

    setIsProcessing(true);

    try {
      while (!settled && curRound <= 5) {
        const res = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerAgent: buyerNode,
            sellerAgent: sellerNode,
            itemDescription,
            referencePrice,
            currentRound: curRound,
            history: currentTranscript,
            turn: curTurn,
          }),
        });

        const data = await res.json();
        if (!data.success || !data.message) break;

        const msg: TranscriptMessage = data.message;
        currentTranscript = [...currentTranscript, msg];
        setTranscript([...currentTranscript]);
        setRound(curRound);

        if (msg.toolCall?.name === "make_offer") {
          setCurrentOffer(msg.toolCall.args.amount);
          curTurn = curTurn === "BUYER" ? "SELLER" : "BUYER";
          setTurn(curTurn);
          if (curTurn === "BUYER") curRound++;
        } else if (msg.toolCall?.name === "accept_offer") {
          settled = true;
          setStatus("Settled");
          const finalTx = msg.txHash || `0x${Math.random().toString(16).substring(2, 66)}`;
          setFinalTxHash(finalTx);
          break;
        } else if (msg.toolCall?.name === "reject_offer") {
          setStatus("Failed");
          break;
        }

        await new Promise((r) => setTimeout(r, 600));
      }

      if (!settled && curRound > 5) {
        setStatus("Failed");
      }
    } catch (err) {
      console.error("Simulation run error:", err);
      setStatus("Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCanvas = () => {
    setRound(0);
    setTurn("BUYER");
    setCurrentOffer(null);
    setStatus("Idle");
    setTranscript([]);
    setFinalTxHash(null);
  };

  const exportTranscriptJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ buyer: buyerNode, seller: sellerNode, deal: itemDescription, transcript }, null, 2)
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `negoagent-session-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredPalette = agents.filter((a) => {
    if (paletteFilter !== "ALL" && a.role !== paletteFilter) return false;
    if (searchQuery.trim()) {
      return a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.strategy.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Calculate SVG Wire Bezier Path
  const wireStart = { x: buyerPos.x + 220, y: buyerPos.y + 60 };
  const wireEnd = { x: sellerPos.x, y: sellerPos.y + 60 };
  const controlPoint1 = { x: wireStart.x + Math.max(40, (wireEnd.x - wireStart.x) / 2), y: wireStart.y };
  const controlPoint2 = { x: wireEnd.x - Math.max(40, (wireEnd.x - wireStart.x) / 2), y: wireEnd.y };
  const wireMidpoint = { x: (wireStart.x + wireEnd.x) / 2, y: (wireStart.y + wireEnd.y) / 2 };
  const bezierPath = `M ${wireStart.x} ${wireStart.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${wireEnd.x} ${wireEnd.y}`;

  return (
    <div className="workbench-studio" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "var(--bg-base)", overflow: "hidden", position: "relative" }}>
      {/* Studio Header Bar */}
      <div 
        style={{ 
          height: "52px", 
          borderBottom: "1px solid var(--border-subtle)", 
          padding: "0 1.25rem", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          background: "var(--bg-surface)",
          zIndex: 20
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-main)" }}>
            Workbench
          </span>

          <div style={{ width: "1px", height: "16px", background: "var(--border-subtle)" }} />

          {/* Deal Config Inputs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Target Asset:</span>
            <input 
              type="text" 
              value={itemDescription} 
              onChange={(e) => setItemDescription(e.target.value)}
              style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-main)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", width: "240px" }}
            />
            <span style={{ color: "var(--text-muted)" }}>Anchor:</span>
            <input 
              type="text" 
              value={referencePrice} 
              onChange={(e) => setReferencePrice(e.target.value)}
              style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-main)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", width: "65px", fontFamily: "var(--font-mono)" }}
            />
            <span style={{ color: "var(--text-muted)" }}>MON</span>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Zoom Controls */}
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "2px" }}>
            <button 
              onClick={handleZoomOut} 
              title="Zoom Out"
              style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ZoomOut size={13} />
            </button>
            <button 
              onClick={handleResetZoom} 
              title="Reset Zoom (100%)"
              style={{ background: "none", border: "none", color: "var(--text-main)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", padding: "2px 6px", cursor: "pointer" }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button 
              onClick={handleZoomIn} 
              title="Zoom In"
              style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button 
            onClick={resetCanvas} 
            disabled={isProcessing}
            className="btn btn-secondary" 
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button 
            onClick={executeNextTurn} 
            disabled={isProcessing || status === "Settled" || status === "Failed"}
            className="btn btn-secondary" 
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          >
            Step Turn
          </button>

          <button 
            onClick={runFullSimulation} 
            disabled={isProcessing || !buyerNode || !sellerNode}
            className="btn btn-primary" 
            style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
          >
            {isProcessing ? (
              <>Simulating...</>
            ) : (
              <>
                <Play size={12} fill="#050b14" /> Run Bargain
              </>
            )}
          </button>

          {/* Collapsible Inspector Toggle Button */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className="btn btn-secondary"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", color: inspectorOpen ? "var(--cyan-primary)" : "var(--text-secondary)" }}
            title={inspectorOpen ? "Collapse Inspector" : "Open Inspector"}
          >
            {inspectorOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span style={{ fontSize: "0.75rem" }}>Inspector</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        
        {/* LEFT PANE: Agent Palette */}
        <div 
          style={{ 
            width: "270px", 
            borderRight: "1px solid var(--border-subtle)", 
            background: "var(--bg-surface)", 
            display: "flex", 
            flexDirection: "column",
            zIndex: 10
          }}
        >
          {/* Palette Header */}
          <div style={{ padding: "0.85rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Agent Library
              </span>
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="btn btn-cyan" 
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
              >
                <Plus size={11} /> New Agent
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: "0.5rem" }}>
              <Search size={13} color="var(--text-muted)" style={{ position: "absolute", left: "8px", top: "7px" }} />
              <input 
                type="text" 
                placeholder="Search agents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.3rem 0.5rem 0.3rem 1.6rem", fontSize: "0.75rem", color: "var(--text-main)" }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "0.2rem" }}>
              {(["ALL", "BUYER", "SELLER"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPaletteFilter(tab)}
                  style={{
                    flex: 1,
                    padding: "0.2rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: paletteFilter === tab ? "var(--bg-surface-hover)" : "transparent",
                    color: paletteFilter === tab ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Palette List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filteredPalette.map((agent) => {
              const isBuyer = agent.role === "BUYER";
              const isDeployed = (isBuyer && buyerNode?.id === agent.id) || (!isBuyer && sellerNode?.id === agent.id);

              return (
                <div 
                  key={agent.id}
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${isDeployed ? (isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)") : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "0.65rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "1rem" }}>{agent.avatar}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {agent.name}
                      </span>
                    </div>
                    <span 
                      style={{ 
                        fontSize: "0.65rem", 
                        fontWeight: 700, 
                        padding: "0.1rem 0.35rem", 
                        borderRadius: "var(--radius-full)",
                        background: isBuyer ? "var(--buyer-cyan-bg)" : "var(--seller-violet-bg)",
                        color: isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)"
                      }}
                    >
                      {agent.role}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    <span>Target: {agent.targetPrice} MON</span>
                    <span>{isBuyer ? `Ceil: ${agent.reservationPrice}` : `Floor: ${agent.reservationPrice}`}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.15rem" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {agent.strategy}
                    </span>
                    <button
                      onClick={() => deployToCanvas(agent)}
                      style={{
                        background: isDeployed ? "rgba(255, 255, 255, 0.04)" : "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: isDeployed ? "var(--status-emerald)" : "var(--text-main)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.68rem",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      {isDeployed ? "✓ Deployed" : "+ Add to Canvas"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANE: Interactive Dot-Grid Canvas with Zoom Container */}
        <div 
          ref={canvasRef}
          className="canvas-grid"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ flex: 1, position: "relative", cursor: draggingTarget ? "grabbing" : "default" }}
        >
          {/* Zoomable Content Layer */}
          <div 
            style={{ 
              width: "100%", 
              height: "100%", 
              position: "relative",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              transition: draggingTarget ? "none" : "transform 0.1s ease-out"
            }}
          >
            {/* SVG Connection Wire */}
            {buyerNode && sellerNode && (
              <svg 
                style={{ 
                  position: "absolute", 
                  inset: 0, 
                  width: "1600px", 
                  height: "1200px", 
                  pointerEvents: "none",
                  zIndex: 5
                }}
              >
                {/* Shadow path */}
                <path d={bezierPath} fill="none" stroke="rgba(0, 0, 0, 0.6)" strokeWidth="4" />
                {/* Base wire */}
                <path d={bezierPath} fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
                {/* Active animated pulse line */}
                {status === "Negotiating" && (
                  <path 
                    d={bezierPath} 
                    fill="none" 
                    stroke={turn === "BUYER" ? "var(--buyer-cyan)" : "var(--seller-violet)"} 
                    strokeWidth="2.5" 
                    className="wire-animated"
                  />
                )}
              </svg>
            )}

            {/* Midpoint Channel Badge */}
            {buyerNode && sellerNode && (
              <div 
                style={{ 
                  position: "absolute", 
                  left: `${wireMidpoint.x - 65}px`, 
                  top: `${wireMidpoint.y - 14}px`, 
                  zIndex: 8,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.2rem 0.55rem",
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                  pointerEvents: "none"
                }}
              >
                <div 
                  style={{ 
                    width: "6px", 
                    height: "6px", 
                    borderRadius: "50%", 
                    background: status === "Settled" ? "var(--status-emerald)" : status === "Negotiating" ? "var(--status-amber)" : "#64748b" 
                  }} 
                />
                <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                  {currentOffer ? `${currentOffer} MON` : "Channel Open"}
                </span>
                <span style={{ color: "var(--text-muted)" }}>• R{round}</span>
              </div>
            )}

            {/* COMPACT BUYER NODE (220px) */}
            {buyerNode && (
              <div 
                className={`canvas-node ${turn === "BUYER" && status === "Negotiating" ? "selected" : ""}`}
                style={{ left: `${buyerPos.x}px`, top: `${buyerPos.y}px` }}
                onMouseDown={(e) => handleMouseDown(e, "BUYER")}
              >
                <div className="node-header" style={{ background: "var(--buyer-cyan-bg)", borderBottom: "1px solid var(--buyer-cyan-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.95rem" }}>{buyerNode.avatar}</span>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {buyerNode.name}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "var(--buyer-cyan)", textTransform: "uppercase", fontWeight: 700 }}>
                        Buyer Node
                      </div>
                    </div>
                  </div>
                  <Move size={12} color="var(--text-muted)" />
                </div>

                <div className="node-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", background: "var(--bg-base)", padding: "0.4rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Target</div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                        {buyerNode.targetPrice} MON
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Ceiling</div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--status-rose)", fontFamily: "var(--font-mono)" }}>
                        {buyerNode.reservationPrice} MON
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    <span>Strategy: <strong style={{ color: "var(--text-secondary)" }}>{buyerNode.strategy}</strong></span>
                    <span>#2291</span>
                  </div>
                </div>

                <div className="node-port port-right" title="Buyer Output Port" />
              </div>
            )}

            {/* COMPACT SELLER NODE (220px) */}
            {sellerNode && (
              <div 
                className={`canvas-node ${turn === "SELLER" && status === "Negotiating" ? "selected" : ""}`}
                style={{ left: `${sellerPos.x}px`, top: `${sellerPos.y}px` }}
                onMouseDown={(e) => handleMouseDown(e, "SELLER")}
              >
                <div className="node-port port-left" title="Seller Input Port" />

                <div className="node-header" style={{ background: "var(--seller-violet-bg)", borderBottom: "1px solid var(--seller-violet-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.95rem" }}>{sellerNode.avatar}</span>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {sellerNode.name}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "var(--seller-violet)", textTransform: "uppercase", fontWeight: 700 }}>
                        Seller Node
                      </div>
                    </div>
                  </div>
                  <Move size={12} color="var(--text-muted)" />
                </div>

                <div className="node-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", background: "var(--bg-base)", padding: "0.4rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Target</div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                        {sellerNode.targetPrice} MON
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Floor</div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--status-emerald)", fontFamily: "var(--font-mono)" }}>
                        {sellerNode.reservationPrice} MON
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    <span>Strategy: <strong style={{ color: "var(--text-secondary)" }}>{sellerNode.strategy}</strong></span>
                    <span>#2292</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty state prompt */}
          {(!buyerNode || !sellerNode) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Click "+ Add to Canvas" on a Buyer and Seller in the left palette to link the negotiation channel.
            </div>
          )}
        </div>

        {/* RIGHT PANE: Collapsible Telemetry & Cognitive Inspector */}
        {inspectorOpen && (
          <div 
            style={{ 
              width: "360px", 
              borderLeft: "1px solid var(--border-subtle)", 
              background: "var(--bg-surface)", 
              display: "flex", 
              flexDirection: "column",
              zIndex: 10
            }}
          >
            {/* Inspector Header */}
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Telemetry & Reasoning Inspector
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {status === "Settled" ? "Consensus Finalized On-Chain" : status === "Negotiating" ? "Live Strategic Reasoning" : "Channel Ready"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {transcript.length > 0 && (
                  <button 
                    onClick={exportTranscriptJson} 
                    className="btn btn-secondary" 
                    style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem" }}
                    title="Export session JSON"
                  >
                    <Download size={12} />
                  </button>
                )}
                <button 
                  onClick={() => setInspectorOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Close Inspector"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Settlement Callout */}
            {status === "Settled" && (
              <div style={{ margin: "0.75rem", padding: "0.75rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--status-emerald)", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                  <CheckCircle2 size={15} /> Deal Settled at {currentOffer} MON
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Escrow finalized on <code>Negotiation.sol</code> after {round} round(s).
                </div>
                {finalTxHash && (
                  <a 
                    href={`https://testnet.monadscan.com/tx/${finalTxHash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--cyan-primary)", marginTop: "0.3rem", fontFamily: "var(--font-mono)" }}
                  >
                    Monadscan Receipt <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            {/* Transcript Dialogue & Qwen Reasoning Streams */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {transcript.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Click <strong>"Run Bargain"</strong> in the top toolbar to begin multi-turn negotiation and inspect Qwen's latent reasoning stream.
                </div>
              ) : (
                transcript.map((msg, idx) => {
                  const isBuyer = msg.senderRole === "BUYER";
                  return (
                    <div 
                      key={msg.id || idx}
                      style={{
                        background: "var(--bg-card)",
                        border: `1px solid ${isBuyer ? "rgba(0, 242, 254, 0.2)" : "rgba(139, 92, 246, 0.2)"}`,
                        borderRadius: "var(--radius-sm)",
                        padding: "0.65rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span 
                          style={{ 
                            fontSize: "0.65rem", 
                            fontWeight: 700, 
                            padding: "0.1rem 0.35rem", 
                            borderRadius: "var(--radius-sm)",
                            background: isBuyer ? "var(--buyer-cyan-bg)" : "var(--seller-violet-bg)",
                            color: isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)"
                          }}
                        >
                          {msg.senderRole} • {msg.agentName}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                          Turn #{idx + 1}
                        </span>
                      </div>

                      {/* Qwen Latent Thought Stream */}
                      {msg.thought && (
                        <div 
                          style={{
                            background: "var(--bg-base)",
                            borderLeft: "2px solid var(--buyer-cyan)",
                            padding: "0.35rem 0.5rem",
                            borderRadius: "2px",
                            fontSize: "0.72rem",
                            color: "#cbd5e1",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.35
                          }}
                        >
                          <div style={{ fontSize: "0.62rem", color: "var(--buyer-cyan)", fontWeight: 700, marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <BrainCircuit size={11} /> QWEN 3.8 MAX REASONING:
                          </div>
                          {msg.thought}
                        </div>
                      )}

                      {/* Natural Dialogue Utterance */}
                      <div style={{ fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                        "{msg.content}"
                      </div>

                      {/* Action pill */}
                      {msg.toolCall && (
                        <div style={{ fontSize: "0.68rem", color: "var(--amber-primary)", fontFamily: "var(--font-mono)", alignSelf: "flex-start", background: "rgba(245, 158, 11, 0.08)", padding: "0.1rem 0.35rem", borderRadius: "2px" }}>
                          action: {msg.toolCall.name}({JSON.stringify(msg.toolCall.args)})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Custom Agent Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem"
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                Create Custom Agent Node
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                  Agent Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Cerberus Arbitrage AI" 
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.45rem", color: "var(--text-main)", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Role
                  </label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value as any)}
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.45rem", color: "var(--text-main)", fontSize: "0.8rem" }}
                  >
                    <option value="BUYER">BUYER (Purchaser)</option>
                    <option value="SELLER">SELLER (Provider)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Strategy
                  </label>
                  <select
                    value={newAgentStrategy}
                    onChange={(e) => setNewAgentStrategy(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.45rem", color: "var(--text-main)", fontSize: "0.8rem" }}
                  >
                    <option value="aggressive">Aggressive (Hard Anchor)</option>
                    <option value="balanced">Balanced (Rational)</option>
                    <option value="cooperative">Cooperative (Fast Deal)</option>
                    <option value="concessionist">Concessionist (Elastic)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    Target Price (MON)
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newAgentTarget}
                    onChange={(e) => setNewAgentTarget(e.target.value)}
                    required
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.45rem", color: "var(--text-main)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                    {newAgentRole === "BUYER" ? "Ceiling BATNA" : "Floor BATNA"} (MON)
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newAgentReservation}
                    onChange={(e) => setNewAgentReservation(e.target.value)}
                    required
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.45rem", color: "var(--text-main)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: "0.8rem" }}>
                  Create & Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
