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
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  Trash2,
  Link as LinkIcon,
  Unlink,
  GripVertical
} from "lucide-react";

export interface AgentProfile {
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

export interface CanvasNode {
  id: string; // unique canvas instance ID e.g. "node_1"
  agentId: string;
  name: string;
  role: "BUYER" | "SELLER";
  strategy: string;
  targetPrice: string;
  reservationPrice: string;
  avatar: string;
  x: number;
  y: number;
}

export interface CanvasChannel {
  id: string; // e.g. "ch_node1_node2"
  fromNodeId: string; // typically BUYER
  toNodeId: string;   // typically SELLER
  status: "idle" | "negotiating" | "settled" | "failed";
  currentOffer?: string;
  round: number;
}

export interface TranscriptMessage {
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

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
  type: "node" | "canvas";
}

export default function WorkbenchPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [paletteFilter, setPaletteFilter] = useState<"ALL" | "BUYER" | "SELLER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Canvas Graph State (Arbitrary Multi-Node Network)
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [channels, setChannels] = useState<CanvasChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Canvas Viewport Transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Interactive Port Wiring State
  const [wiringFromNodeId, setWiringFromNodeId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Custom Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: "canvas"
  });

  // Telemetry & Inspector Drawer
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Deal Configuration
  const [itemDescription, setItemDescription] = useState("Tier-1 Dedicated RPC Streaming Endpoint");
  const [referencePrice, setReferencePrice] = useState("10.0");

  // Simulation Runtime State
  const [turn, setTurn] = useState<"BUYER" | "SELLER">("BUYER");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalTxHash, setFinalTxHash] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll Inspector to latest message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isProcessing]);

  // Custom Agent Creator Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [newAgentStrategy, setNewAgentStrategy] = useState("balanced");
  const [newAgentTarget, setNewAgentTarget] = useState("6.5");
  const [newAgentReservation, setNewAgentReservation] = useState("8.5");

  // Load Seed Agents & initialize initial network pair
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.success && data.agents?.length > 0) {
          setAgents(data.agents);

          // Populate initial nodes on canvas
          const buyer = data.agents.find((a: AgentProfile) => a.role === "BUYER");
          const seller = data.agents.find((a: AgentProfile) => a.role === "SELLER");

          if (buyer && seller) {
            const bNode: CanvasNode = {
              id: `node_${Date.now()}_1`,
              agentId: buyer.id,
              name: buyer.name,
              role: "BUYER",
              strategy: buyer.strategy,
              targetPrice: buyer.targetPrice,
              reservationPrice: buyer.reservationPrice,
              avatar: buyer.avatar,
              x: 80,
              y: 100
            };
            const sNode: CanvasNode = {
              id: `node_${Date.now()}_2`,
              agentId: seller.id,
              name: seller.name,
              role: "SELLER",
              strategy: seller.strategy,
              targetPrice: seller.targetPrice,
              reservationPrice: seller.reservationPrice,
              avatar: seller.avatar,
              x: 440,
              y: 100
            };

            const ch: CanvasChannel = {
              id: `ch_${bNode.id}_${sNode.id}`,
              fromNodeId: bNode.id,
              toNodeId: sNode.id,
              status: "idle",
              round: 0
            };

            setNodes([bNode, sNode]);
            setChannels([ch]);
            setActiveChannelId(ch.id);
          }
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
      }
    }
    loadAgents();
  }, []);

  // Isolated Canvas Wheel Zoom (zero page scroll)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prevZoom) => {
        const next = Math.max(0.4, Math.min(2.0, parseFloat((prevZoom + delta).toFixed(2))));
        return next;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const closeMenu = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // HTML5 Drag & Drop from Palette
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("agent");
    if (!dataStr || !canvasRef.current) return;

    try {
      const agent: AgentProfile = JSON.parse(dataStr);
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = (e.clientX - rect.left - pan.x) / zoom;
      const dropY = (e.clientY - rect.top - pan.y) / zoom;

      const newNode: CanvasNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        strategy: agent.strategy,
        targetPrice: agent.targetPrice,
        reservationPrice: agent.reservationPrice,
        avatar: agent.avatar,
        x: Math.max(10, Math.round(dropX - 100)),
        y: Math.max(10, Math.round(dropY - 50))
      };

      setNodes((prev) => [...prev, newNode]);

      // If there is an existing opposite-role node with no channel, automatically create a candidate channel
      const opposite = nodes.find((n) => n.role !== newNode.role);
      if (opposite) {
        const fromId = newNode.role === "BUYER" ? newNode.id : opposite.id;
        const toId = newNode.role === "SELLER" ? newNode.id : opposite.id;
        const exists = channels.some((c) => c.fromNodeId === fromId && c.toNodeId === toId);
        if (!exists) {
          const newCh: CanvasChannel = {
            id: `ch_${fromId}_${toId}`,
            fromNodeId: fromId,
            toNodeId: toId,
            status: "idle",
            round: 0
          };
          setChannels((prev) => [...prev, newCh]);
          if (!activeChannelId) setActiveChannelId(newCh.id);
        }
      }
    } catch (err) {
      console.error("Drop agent parse error:", err);
    }
  };

  // Node Drag Move
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (e.button !== 0) return; // Only primary click
    e.stopPropagation();
    setDraggingNodeId(node.id);
    dragOffset.current = {
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y
    };
  };

  // Canvas Pan Move
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey || (e.button === 0 && !draggingNodeId)) {
      // Pan canvas
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round(e.clientX / zoom - dragOffset.current.x);
      const newY = Math.round(e.clientY / zoom - dragOffset.current.y);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    }

    if (wiringFromNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCursorPos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  }, [draggingNodeId, isPanning, wiringFromNodeId, zoom, pan]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setIsPanning(false);
    if (wiringFromNodeId) {
      setWiringFromNodeId(null);
      setCursorPos(null);
    }
  }, [wiringFromNodeId]);

  // Port Wiring Interaction
  const handlePortMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    setWiringFromNodeId(node.id);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCursorPos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handlePortMouseUp = (e: React.MouseEvent, targetNode: CanvasNode) => {
    e.stopPropagation();
    if (!wiringFromNodeId || wiringFromNodeId === targetNode.id) {
      setWiringFromNodeId(null);
      setCursorPos(null);
      return;
    }

    const sourceNode = nodes.find((n) => n.id === wiringFromNodeId);
    if (!sourceNode) return;

    // Connect buyer to seller
    let fromId = sourceNode.id;
    let toId = targetNode.id;
    if (sourceNode.role === "SELLER" && targetNode.role === "BUYER") {
      fromId = targetNode.id;
      toId = sourceNode.id;
    }

    const exists = channels.some((c) => c.fromNodeId === fromId && c.toNodeId === toId);
    if (!exists) {
      const newCh: CanvasChannel = {
        id: `ch_${fromId}_${toId}`,
        fromNodeId: fromId,
        toNodeId: toId,
        status: "idle",
        round: 0
      };
      setChannels((prev) => [...prev, newCh]);
      setActiveChannelId(newCh.id);
    }

    setWiringFromNodeId(null);
    setCursorPos(null);
  };

  // Custom Right Click Handler
  const handleNodeContextMenu = (e: React.MouseEvent, node: CanvasNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      type: "node"
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: "canvas"
    });
  };

  // Node Actions
  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setChannels((prev) => prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (activeChannel?.fromNodeId === nodeId || activeChannel?.toNodeId === nodeId) {
      setActiveChannelId(null);
    }
  };

  const connectToCounterparty = (sourceNodeId: string) => {
    const source = nodes.find((n) => n.id === sourceNodeId);
    if (!source) return;
    const target = nodes.find((n) => n.id !== sourceNodeId && n.role !== source.role);
    if (!target) {
      alert(`Please drag a ${source.role === "BUYER" ? "SELLER" : "BUYER"} agent from the palette onto the canvas to connect.`);
      return;
    }
    const fromId = source.role === "BUYER" ? source.id : target.id;
    const toId = source.role === "SELLER" ? source.id : target.id;
    const exists = channels.some((c) => c.fromNodeId === fromId && c.toNodeId === toId);
    if (!exists) {
      const newCh: CanvasChannel = {
        id: `ch_${fromId}_${toId}`,
        fromNodeId: fromId,
        toNodeId: toId,
        status: "idle",
        round: 0
      };
      setChannels((prev) => [...prev, newCh]);
      setActiveChannelId(newCh.id);
    }
  };

  // Active Channel & Agents
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeBuyer = activeChannel ? nodes.find((n) => n.id === activeChannel.fromNodeId) : null;
  const activeSeller = activeChannel ? nodes.find((n) => n.id === activeChannel.toNodeId) : null;

  // Run Step-by-Step Turn on Active Channel
  const executeNextTurn = async () => {
    if (!activeBuyer || !activeSeller || isProcessing || !activeChannel) return;

    setIsProcessing(true);
    setChannels((prev) =>
      prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "negotiating" } : c))
    );

    const nextTurn = activeChannel.round === 0 ? "BUYER" : turn;
    const currentRoundNum = activeChannel.round === 0 ? 1 : (nextTurn === "BUYER" ? activeChannel.round + 1 : activeChannel.round);

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAgent: activeBuyer,
          sellerAgent: activeSeller,
          itemDescription,
          referencePrice,
          currentRound: currentRoundNum,
          history: transcript,
          turn: nextTurn
        })
      });

      const data = await res.json();

      if (data.success && data.message) {
        const msg: TranscriptMessage = data.message;
        setTranscript((prev) => [...prev, msg]);

        if (msg.toolCall?.name === "make_offer") {
          const offer = msg.toolCall.args.amount;
          setChannels((prev) =>
            prev.map((c) =>
              c.id === activeChannel.id ? { ...c, currentOffer: offer, round: currentRoundNum } : c
            )
          );
          setTurn(nextTurn === "BUYER" ? "SELLER" : "BUYER");
        } else if (msg.toolCall?.name === "accept_offer") {
          setChannels((prev) =>
            prev.map((c) =>
              c.id === activeChannel.id ? { ...c, status: "settled", round: currentRoundNum } : c
            )
          );
          setFinalTxHash(msg.txHash || `0x${Math.random().toString(16).substring(2, 66)}`);
        } else if (msg.toolCall?.name === "reject_offer") {
          setChannels((prev) =>
            prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "failed" } : c))
          );
        }
      }
    } catch (err) {
      console.error("Turn execution error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Full Multi-Turn Bargaining Loop
  const runFullSimulation = async () => {
    if (!activeBuyer || !activeSeller || isProcessing || !activeChannel) return;

    setTranscript([]);
    setFinalTxHash(null);
    setChannels((prev) =>
      prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "negotiating", round: 0, currentOffer: undefined } : c))
    );

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
            buyerAgent: activeBuyer,
            sellerAgent: activeSeller,
            itemDescription,
            referencePrice,
            currentRound: curRound,
            history: currentTranscript,
            turn: curTurn
          }),
        });

        const data = await res.json();
        if (!data.success || !data.message) break;

        const msg: TranscriptMessage = data.message;
        currentTranscript = [...currentTranscript, msg];
        setTranscript([...currentTranscript]);

        if (msg.toolCall?.name === "make_offer") {
          const offer = msg.toolCall.args.amount;
          setChannels((prev) =>
            prev.map((c) =>
              c.id === activeChannel.id ? { ...c, currentOffer: offer, round: curRound } : c
            )
          );
          curTurn = curTurn === "BUYER" ? "SELLER" : "BUYER";
          setTurn(curTurn);
          if (curTurn === "BUYER") curRound++;
        } else if (msg.toolCall?.name === "accept_offer") {
          settled = true;
          setChannels((prev) =>
            prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "settled", round: curRound } : c))
          );
          setFinalTxHash(msg.txHash || `0x${Math.random().toString(16).substring(2, 66)}`);
          break;
        } else if (msg.toolCall?.name === "reject_offer") {
          setChannels((prev) =>
            prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "failed" } : c))
          );
          break;
        }

        // Sub-second delay mirroring Monad block time
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.error("Simulation run error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetActiveChannel = () => {
    if (!activeChannel) return;
    setChannels((prev) =>
      prev.map((c) => (c.id === activeChannel.id ? { ...c, status: "idle", round: 0, currentOffer: undefined } : c))
    );
    setTranscript([]);
    setFinalTxHash(null);
  };

  const clearCanvas = () => {
    setNodes([]);
    setChannels([]);
    setActiveChannelId(null);
    setTranscript([]);
    setFinalTxHash(null);
  };

  // Custom Agent Creation
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
          avatar: newAgentRole === "BUYER" ? "🤖" : "🏢"
        }),
      });
      const data = await res.json();
      if (data.success && data.agent) {
        setAgents((prev) => [data.agent, ...prev]);

        // Place on canvas immediately
        const newNode: CanvasNode = {
          id: `node_${Date.now()}`,
          agentId: data.agent.id,
          name: data.agent.name,
          role: data.agent.role,
          strategy: data.agent.strategy,
          targetPrice: data.agent.targetPrice,
          reservationPrice: data.agent.reservationPrice,
          avatar: data.agent.avatar,
          x: Math.round(150 + Math.random() * 200),
          y: Math.round(100 + Math.random() * 150)
        };
        setNodes((prev) => [...prev, newNode]);
        setShowCreateModal(false);
        setNewAgentName("");
      }
    } catch (err) {
      console.error("Create agent error:", err);
    }
  };

  const exportTranscriptJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ channel: activeChannel, buyer: activeBuyer, seller: activeSeller, deal: itemDescription, transcript }, null, 2)
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `negoagent-network-session-${Date.now()}.json`);
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

  return (
    <div 
      className="workbench-studio" 
      style={{ 
        position: "fixed", 
        inset: 0, 
        display: "flex", 
        flexDirection: "column", 
        background: "var(--bg-base)", 
        overflow: "hidden",
        zIndex: 999
      }}
    >
      {/* MINIMAL DEDICATED STUDIO TOP BAR (Clean, spacious, uncrowded) */}
      <div 
        style={{ 
          height: "48px", 
          borderBottom: "1px solid var(--border-subtle)", 
          padding: "0 1rem", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          background: "var(--bg-surface)",
          zIndex: 50
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Quick Return to Home Button */}
          <Link 
            href="/" 
            className="btn btn-secondary" 
            style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            title="Exit Studio to Home"
          >
            <ArrowLeft size={13} /> Home
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              Workbench
            </span>
            <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-full)", background: "rgba(0, 242, 254, 0.08)", color: "var(--cyan-primary)", border: "1px solid rgba(0, 242, 254, 0.2)", fontFamily: "var(--font-mono)" }}>
              Monad Testnet 10143
            </span>
          </div>
        </div>

        {/* Toolbar Center & Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button 
            onClick={resetActiveChannel} 
            disabled={isProcessing}
            className="btn btn-secondary" 
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
            title="Reset active channel offers"
          >
            <RotateCcw size={11} /> Reset
          </button>

          <button 
            onClick={executeNextTurn} 
            disabled={isProcessing || !activeChannel || activeChannel.status === "settled"}
            className="btn btn-secondary" 
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
          >
            Step Turn
          </button>

          <button 
            onClick={runFullSimulation} 
            disabled={isProcessing || !activeBuyer || !activeSeller}
            className="btn btn-primary" 
            style={{ padding: "0.3rem 0.85rem", fontSize: "0.75rem" }}
          >
            {isProcessing ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span className="spinner" style={{ width: "10px", height: "10px", border: "2px solid #050b14", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Negotiating...
              </span>
            ) : (
              <>
                <Play size={11} fill="#050b14" /> Run Bargain
              </>
            )}
          </button>

          <button 
            onClick={clearCanvas} 
            className="btn btn-secondary" 
            style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
            title="Clear all nodes from canvas"
          >
            <Trash2 size={12} color="var(--text-muted)" />
          </button>

          {/* Toggle Collapsible Inspector */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className="btn btn-secondary"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: inspectorOpen ? "var(--cyan-primary)" : "var(--text-secondary)" }}
            title={inspectorOpen ? "Close Inspector" : "Open Inspector"}
          >
            {inspectorOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span style={{ fontSize: "0.72rem" }}>Inspector</span>
          </button>
        </div>
      </div>

      {/* STUDIO 3-PANE WORKSPACE */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        
        {/* LEFT PANE: Agent Library (Draggable Palette) */}
        <div 
          style={{ 
            width: "250px", 
            borderRight: "1px solid var(--border-subtle)", 
            background: "var(--bg-surface)", 
            display: "flex", 
            flexDirection: "column",
            zIndex: 10
          }}
        >
          <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Agent Library
              </span>
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="btn btn-cyan" 
                style={{ padding: "0.2rem 0.45rem", fontSize: "0.68rem" }}
              >
                <Plus size={10} /> New Agent
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: "0.4rem" }}>
              <Search size={12} color="var(--text-muted)" style={{ position: "absolute", left: "7px", top: "7px" }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.25rem 0.4rem 0.25rem 1.5rem", fontSize: "0.72rem", color: "var(--text-main)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.2rem" }}>
              {(["ALL", "BUYER", "SELLER"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPaletteFilter(tab)}
                  style={{
                    flex: 1,
                    padding: "0.2rem",
                    fontSize: "0.68rem",
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

          {/* Draggable Agent Card List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {filteredPalette.map((agent) => {
              const isBuyer = agent.role === "BUYER";
              const deployedCount = nodes.filter((n) => n.agentId === agent.id).length;

              return (
                <div 
                  key={agent.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("agent", JSON.stringify(agent));
                  }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.55rem 0.65rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    cursor: "grab",
                    userSelect: "none",
                    transition: "border-color 0.15s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <GripVertical size={11} color="var(--text-muted)" />
                      <span style={{ fontSize: "0.95rem" }}>{agent.avatar}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {agent.name}
                      </span>
                    </div>
                    <span 
                      style={{ 
                        fontSize: "0.62rem", 
                        fontWeight: 700, 
                        padding: "0.05rem 0.3rem", 
                        borderRadius: "var(--radius-full)",
                        background: isBuyer ? "var(--buyer-cyan-bg)" : "var(--seller-violet-bg)",
                        color: isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)"
                      }}
                    >
                      {agent.role}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    <span>Target: {agent.targetPrice} MON</span>
                    <span>{isBuyer ? `Ceil: ${agent.reservationPrice}` : `Floor: ${agent.reservationPrice}`}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.1rem" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {agent.strategy}
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)" }}>
                      {deployedCount > 0 ? `${deployedCount} on board` : "⠿ Drag to Board"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANE: Dot-Grid Canvas with Multi-Node Network Graph */}
        <div 
          ref={canvasRef}
          className="canvas-grid"
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleCanvasContextMenu}
          style={{ flex: 1, position: "relative", cursor: isPanning ? "grabbing" : "crosshair", overflow: "hidden" }}
        >
          {/* SLEEK MINIMAL FLOATING OVERLAY ON CANVAS (Takes minimal space, stays fixed on screen) */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              background: "rgba(10, 16, 30, 0.85)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "9999px",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
              maxWidth: "calc(100% - 32px)",
              pointerEvents: "auto",
              userSelect: "none"
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Active Channel Indicator */}
            {activeChannel ? (
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.35rem", 
                  fontSize: "0.72rem",
                  cursor: "pointer"
                }}
                onClick={() => setInspectorOpen(true)}
                title="Click to focus channel in Inspector"
              >
                <div 
                  style={{ 
                    width: "6px", 
                    height: "6px", 
                    borderRadius: "50%", 
                    background: activeChannel.status === "settled" ? "var(--status-emerald)" : activeChannel.status === "negotiating" ? "var(--status-amber)" : "#64748b",
                    boxShadow: activeChannel.status === "negotiating" ? "0 0 8px var(--status-amber)" : "none"
                  }} 
                />
                <span style={{ color: "var(--buyer-cyan)", fontWeight: 700 }}>
                  {activeBuyer?.name ? activeBuyer.name.replace(/\s*\(Buyer\)/i, "") : "Buyer"}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>↔</span>
                <span style={{ color: "var(--seller-violet)", fontWeight: 700 }}>
                  {activeSeller?.name ? activeSeller.name.replace(/\s*\(Seller\)/i, "") : "Seller"}
                </span>
                <span 
                  style={{ 
                    fontSize: "0.62rem", 
                    padding: "0.08rem 0.35rem",
                    borderRadius: "var(--radius-full)",
                    background: activeChannel.status === "settled" ? "rgba(16, 185, 129, 0.15)" : activeChannel.status === "negotiating" ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    color: activeChannel.status === "settled" ? "var(--status-emerald)" : activeChannel.status === "negotiating" ? "var(--status-amber)" : "var(--text-muted)",
                    fontWeight: 700
                  }}
                >
                  {activeChannel.status}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>No Active Channel</span>
            )}

            <div style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.12)" }} />

            {/* Inline Deal Target & Anchor */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Target:</span>
              <input 
                type="text" 
                value={itemDescription} 
                onChange={(e) => setItemDescription(e.target.value)}
                title="Deal Asset / Service"
                style={{ 
                  background: "rgba(255, 255, 255, 0.05)", 
                  border: "1px solid rgba(255, 255, 255, 0.08)", 
                  color: "var(--text-main)", 
                  padding: "0.15rem 0.4rem", 
                  borderRadius: "var(--radius-sm)", 
                  fontSize: "0.7rem", 
                  width: "155px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Anchor:</span>
              <input 
                type="text" 
                value={referencePrice} 
                onChange={(e) => setReferencePrice(e.target.value)}
                title="Baseline Reference Price (MON)"
                style={{ 
                  background: "rgba(255, 255, 255, 0.05)", 
                  border: "1px solid rgba(255, 255, 255, 0.08)", 
                  color: "var(--text-main)", 
                  padding: "0.15rem 0.35rem", 
                  borderRadius: "var(--radius-sm)", 
                  fontSize: "0.7rem", 
                  width: "42px", 
                  fontFamily: "var(--font-mono)",
                  textAlign: "center"
                }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>MON</span>
            </div>

            <div style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.12)" }} />

            {/* Minimal Canvas Zoom Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
              <button 
                onClick={() => setZoom((z) => Math.max(0.4, parseFloat((z - 0.1).toFixed(1))))} 
                title="Zoom Out Canvas"
                style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: "2px 4px", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <ZoomOut size={11} />
              </button>
              <button 
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} 
                title="Reset Zoom to 100%"
                style={{ background: "none", border: "none", color: "var(--text-main)", fontSize: "0.7rem", fontFamily: "var(--font-mono)", padding: "2px 4px", cursor: "pointer" }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button 
                onClick={() => setZoom((z) => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))))} 
                title="Zoom In Canvas"
                style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: "2px 4px", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <ZoomIn size={11} />
              </button>
            </div>
          </div>

          {/* Zoom & Pan Container */}
          <div 
            style={{ 
              width: "100%", 
              height: "100%", 
              position: "relative",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* SVG MULTI-CHANNEL WIRE LAYER */}
            <svg 
              style={{ 
                position: "absolute", 
                inset: 0, 
                width: "4000px", 
                height: "4000px", 
                pointerEvents: "none",
                zIndex: 5
              }}
            >
              {channels.map((ch) => {
                const fromNode = nodes.find((n) => n.id === ch.fromNodeId);
                const toNode = nodes.find((n) => n.id === ch.toNodeId);
                if (!fromNode || !toNode) return null;

                const startX = fromNode.x + 200;
                const startY = fromNode.y + 55;
                const endX = toNode.x;
                const endY = toNode.y + 55;
                const cpDist = Math.max(40, Math.abs(endX - startX) / 2);
                const pathData = `M ${startX} ${startY} C ${startX + cpDist} ${startY}, ${endX - cpDist} ${endY}, ${endX} ${endY}`;
                const isActive = activeChannelId === ch.id;

                return (
                  <g key={ch.id}>
                    {/* Shadow Wire */}
                    <path d={pathData} fill="none" stroke="rgba(0, 0, 0, 0.7)" strokeWidth="4" />
                    {/* Base Line */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke={isActive ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)"} 
                      strokeWidth={isActive ? "2.5" : "1.5"} 
                    />
                    {/* Active Pulsing Negotiation Packets */}
                    {ch.status === "negotiating" && (
                      <path 
                        d={pathData} 
                        fill="none" 
                        stroke="var(--buyer-cyan)" 
                        strokeWidth="3" 
                        className="wire-animated"
                      />
                    )}
                  </g>
                );
              })}

              {/* Rubberband line during manual port dragging */}
              {wiringFromNodeId && cursorPos && (
                (() => {
                  const src = nodes.find((n) => n.id === wiringFromNodeId);
                  if (!src) return null;
                  const sX = src.role === "BUYER" ? src.x + 200 : src.x;
                  const sY = src.y + 55;
                  return (
                    <line 
                      x1={sX} 
                      y1={sY} 
                      x2={cursorPos.x} 
                      y2={cursorPos.y} 
                      stroke="var(--buyer-cyan)" 
                      strokeWidth="2" 
                      strokeDasharray="4 4" 
                    />
                  );
                })()
              )}
            </svg>

            {/* CHANNEL MIDPOINT BADGES */}
            {channels.map((ch) => {
              const fromNode = nodes.find((n) => n.id === ch.fromNodeId);
              const toNode = nodes.find((n) => n.id === ch.toNodeId);
              if (!fromNode || !toNode) return null;

              const midX = (fromNode.x + 200 + toNode.x) / 2;
              const midY = (fromNode.y + 55 + toNode.y + 55) / 2;
              const isActive = activeChannelId === ch.id;

              return (
                <div 
                  key={`badge_${ch.id}`}
                  onClick={(e) => { e.stopPropagation(); setActiveChannelId(ch.id); setInspectorOpen(true); }}
                  style={{ 
                    position: "absolute", 
                    left: `${midX - 55}px`, 
                    top: `${midY - 12}px`, 
                    zIndex: 8,
                    background: isActive ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                    border: `1px solid ${isActive ? "var(--border-medium)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-full)",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.68rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.4)",
                    cursor: "pointer"
                  }}
                  title="Click to select this channel for negotiation"
                >
                  <div 
                    style={{ 
                      width: "5px", 
                      height: "5px", 
                      borderRadius: "50%", 
                      background: ch.status === "settled" ? "var(--status-emerald)" : ch.status === "negotiating" ? "var(--status-amber)" : "#64748b" 
                    }} 
                  />
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    {ch.currentOffer ? `${ch.currentOffer} M` : "Link"}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>• R{ch.round}</span>
                </div>
              );
            })}

            {/* COMPACT CANVAS NODES (200px width) */}
            {nodes.map((node) => {
              const isBuyer = node.role === "BUYER";
              const isCurrentChannel = activeChannel && (activeChannel.fromNodeId === node.id || activeChannel.toNodeId === node.id);

              return (
                <div 
                  key={node.id}
                  className={`canvas-node ${isCurrentChannel && activeChannel?.status === "negotiating" ? "selected" : ""}`}
                  style={{ 
                    left: `${node.x}px`, 
                    top: `${node.y}px`,
                    width: "200px",
                    border: `1px solid ${isCurrentChannel ? (isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)") : "var(--border-medium)"}`
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onContextMenu={(e) => handleNodeContextMenu(e, node)}
                >
                  {/* Left Port (Input) */}
                  <div 
                    className="node-port port-left" 
                    title="Input Port (Drop wire to connect)" 
                    onMouseUp={(e) => handlePortMouseUp(e, node)}
                  />

                  {/* Node Header */}
                  <div className="node-header" style={{ background: isBuyer ? "var(--buyer-cyan-bg)" : "var(--seller-violet-bg)", borderBottom: `1px solid ${isBuyer ? "var(--buyer-cyan-border)" : "var(--seller-violet-border)"}`, padding: "0.4rem 0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.9rem" }}>{node.avatar}</span>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                          {node.name}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)", textTransform: "uppercase", fontWeight: 700 }}>
                          {node.role} NODE
                        </div>
                      </div>
                    </div>
                    <Move size={11} color="var(--text-muted)" />
                  </div>

                  {/* Node Body */}
                  <div className="node-body" style={{ padding: "0.5rem 0.6rem", gap: "0.35rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", background: "var(--bg-base)", padding: "0.35rem 0.45rem", borderRadius: "var(--radius-sm)" }}>
                      <div>
                        <div style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>Target</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                          {node.targetPrice} MON
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>{isBuyer ? "Ceiling" : "Floor"}</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isBuyer ? "var(--status-rose)" : "var(--status-emerald)", fontFamily: "var(--font-mono)" }}>
                          {node.reservationPrice} MON
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                      <span>Strategy: <strong style={{ color: "var(--text-secondary)" }}>{node.strategy}</strong></span>
                      <span style={{ color: "var(--cyan-primary)" }}>Right-click ⚙</span>
                    </div>
                  </div>

                  {/* Right Port (Output) */}
                  <div 
                    className="node-port port-right" 
                    title="Output Port (Drag wire to connect)"
                    onMouseDown={(e) => handlePortMouseDown(e, node)}
                  />
                </div>
              );
            })}
          </div>

          {/* Empty Canvas Guidance */}
          {nodes.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem", gap: "0.5rem", pointerEvents: "none" }}>
              <Zap size={24} color="var(--buyer-cyan)" style={{ opacity: 0.6 }} />
              <div>Drag Buyer and Seller agents from the left library onto this board to form trade networks.</div>
              <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Tip: Right-click anywhere for quick options. Use mouse wheel to zoom the canvas.</div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Collapsible Telemetry & Cognitive Inspector */}
        {inspectorOpen && (
          <div 
            style={{ 
              width: "350px", 
              borderLeft: "1px solid var(--border-subtle)", 
              background: "var(--bg-surface)", 
              display: "flex", 
              flexDirection: "column",
              zIndex: 10
            }}
          >
            <div style={{ padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Channel Reasoning Inspector
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {activeChannel ? `${activeBuyer?.name || "Buyer"} ↔ ${activeSeller?.name || "Seller"}` : "No Channel Selected"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {transcript.length > 0 && (
                  <button 
                    onClick={exportTranscriptJson} 
                    className="btn btn-secondary" 
                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.68rem" }}
                    title="Export session JSON"
                  >
                    <Download size={11} />
                  </button>
                )}
                <button 
                  onClick={() => setInspectorOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Settlement Status Banner */}
            {activeChannel?.status === "settled" && (
              <div style={{ margin: "0.65rem", padding: "0.65rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--status-emerald)", fontWeight: 700, fontSize: "0.78rem", marginBottom: "0.15rem" }}>
                  <CheckCircle2 size={14} /> Deal Settled at {activeChannel.currentOffer} MON
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                  Escrow finalized on <code>Negotiation.sol</code> on Monad Testnet.
                </div>
                {finalTxHash && (
                  <a 
                    href={`https://testnet.monadscan.com/tx/${finalTxHash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: "var(--cyan-primary)", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}
                  >
                    Monadscan Receipt <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}

            {/* Turn-by-Turn Dialogue & Qwen Latent Thought Stream */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.65rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {transcript.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  Select or connect a Buyer and Seller on the canvas, then click <strong>"Run Bargain"</strong> to stream Qwen's strategic thoughts and offers.
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
                        padding: "0.6rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span 
                          style={{ 
                            fontSize: "0.62rem", 
                            fontWeight: 700, 
                            padding: "0.1rem 0.35rem", 
                            borderRadius: "var(--radius-sm)",
                            background: isBuyer ? "var(--buyer-cyan-bg)" : "var(--seller-violet-bg)",
                            color: isBuyer ? "var(--buyer-cyan)" : "var(--seller-violet)"
                          }}
                        >
                          {msg.senderRole} • {msg.agentName}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                          Turn #{idx + 1}
                        </span>
                      </div>

                      {/* Qwen Latent Thought Box */}
                      {msg.thought && (
                        <div 
                          style={{
                            background: "var(--bg-base)",
                            borderLeft: "2px solid var(--buyer-cyan)",
                            padding: "0.3rem 0.45rem",
                            borderRadius: "2px",
                            fontSize: "0.7rem",
                            color: "#cbd5e1",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.3
                          }}
                        >
                          <div style={{ fontSize: "0.6rem", color: "var(--buyer-cyan)", fontWeight: 700, marginBottom: "0.1rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <BrainCircuit size={10} /> QWEN REASONING:
                          </div>
                          {msg.thought}
                        </div>
                      )}

                      {/* Natural Dialogue Utterance */}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)", lineHeight: 1.35 }}>
                        "{msg.content}"
                      </div>

                      {/* Action call pill */}
                      {msg.toolCall && (
                        <div style={{ fontSize: "0.65rem", color: "var(--amber-primary)", fontFamily: "var(--font-mono)", alignSelf: "flex-start", background: "rgba(245, 158, 11, 0.08)", padding: "0.08rem 0.3rem", borderRadius: "2px" }}>
                          action: {msg.toolCall.name}({JSON.stringify(msg.toolCall.args)})
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isProcessing && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem", background: "rgba(0, 242, 254, 0.05)", borderRadius: "var(--radius-sm)", border: "1px dashed rgba(0, 242, 254, 0.3)", fontSize: "0.72rem", color: "var(--buyer-cyan)" }}>
                  <div style={{ width: "12px", height: "12px", border: "2px solid var(--buyer-cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span>{turn === "BUYER" ? activeBuyer?.name : activeSeller?.name} is reasoning (Qwen 3.8 Max)...</span>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* CUSTOM RIGHT-CLICK CONTEXT MENU */}
      {contextMenu.visible && (
        <div 
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000,
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-sm)",
            padding: "4px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
            minWidth: "180px",
            fontSize: "0.78rem"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "node" && contextMenu.nodeId && (
            <>
              <button
                onClick={() => {
                  connectToCounterparty(contextMenu.nodeId!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <LinkIcon size={12} color="var(--buyer-cyan)" /> Connect Channel to Agent...
              </button>

              <button
                onClick={() => {
                  executeNextTurn();
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <Play size={12} color="var(--status-emerald)" /> Step Negotiation Turn
              </button>

              <div style={{ height: "1px", background: "var(--border-subtle)", margin: "3px 0" }} />

              <button
                onClick={() => {
                  deleteNode(contextMenu.nodeId!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", color: "#fb7185", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <Trash2 size={12} /> Remove Node from Board
              </button>
            </>
          )}

          {contextMenu.type === "canvas" && (
            <>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <Plus size={12} color="var(--buyer-cyan)" /> Create Custom Agent
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <Maximize2 size={12} /> Reset Board View (100%)
              </button>
            </>
          )}
        </div>
      )}

      {/* CREATE CUSTOM AGENT MODAL */}
      {showCreateModal && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem"
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                Create Custom Agent Node
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>
                  Agent Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Cerberus Arbitrage AI" 
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.4rem", color: "var(--text-main)", fontSize: "0.78rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>
                    Role
                  </label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value as any)}
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.4rem", color: "var(--text-main)", fontSize: "0.78rem" }}
                  >
                    <option value="BUYER">BUYER (Purchaser)</option>
                    <option value="SELLER">SELLER (Provider)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>
                    Strategy
                  </label>
                  <select
                    value={newAgentStrategy}
                    onChange={(e) => setNewAgentStrategy(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.4rem", color: "var(--text-main)", fontSize: "0.78rem" }}
                  >
                    <option value="aggressive">Aggressive</option>
                    <option value="balanced">Balanced</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="concessionist">Concessionist</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>
                    Target Price (MON)
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newAgentTarget}
                    onChange={(e) => setNewAgentTarget(e.target.value)}
                    required
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.4rem", color: "var(--text-main)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>
                    {newAgentRole === "BUYER" ? "Ceiling BATNA" : "Floor BATNA"} (MON)
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newAgentReservation}
                    onChange={(e) => setNewAgentReservation(e.target.value)}
                    required
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.4rem", color: "var(--text-main)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1, fontSize: "0.75rem" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: "0.75rem" }}>
                  Create & Place on Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
