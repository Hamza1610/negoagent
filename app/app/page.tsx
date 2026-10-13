"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Zap, 
  ShieldCheck, 
  Coins, 
  ExternalLink, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  Play, 
  Clock, 
  Layers,
  Sparkles,
  Award,
  ChevronRight
} from "lucide-react";

const MONAD_CHAIN_ID = 10143;
const MONAD_HEX_CHAIN_ID = "0x279f";
const MONAD_RPC = "https://testnet-rpc.monad.xyz";
const MONAD_EXPLORER = "https://testnet.monadscan.com";

function getEthereumProvider() {
  if (typeof window === "undefined") return null;
  const anyWindow = window as any;
  if (!anyWindow.ethereum) return null;

  // Handle multi-wallet setups (MetaMask, Phantom, Coinbase, Rabby)
  if (Array.isArray(anyWindow.ethereum.providers)) {
    const mm = anyWindow.ethereum.providers.find((p: any) => p.isMetaMask && !p.isPhantom);
    if (mm) return mm;
    return anyWindow.ethereum.providers[0];
  }

  return anyWindow.ethereum;
}

export default function LiveAppPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live on-chain runner state
  const [isRunningLive, setIsRunningLive] = useState(false);
  const [runLogs, setRunLogs] = useState<Array<{ step: number; title: string; detail: string; txHash?: string; agentId?: string }>>([]);
  const [runResult, setRunResult] = useState<any>(null);

  // Contract Addresses from environment
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const negotiationContract = "0x37645e013f972aa79fe452b5763c8ae1c7cbee18";

  // Check if wallet is already connected safely
  useEffect(() => {
    const eth = getEthereumProvider();
    if (!eth) return;

    eth.request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          fetchBalance(accounts[0]);
        }
      })
      .catch(() => {
        // Wallet is locked or not yet authorized
      });

    eth.request({ method: "eth_chainId" })
      .then((hexChain: string) => {
        if (hexChain) setChainId(parseInt(hexChain, 16));
      })
      .catch(() => {
        // Safe to ignore
      });

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchBalance(accounts[0]);
      } else {
        setWalletAddress(null);
        setBalance(null);
      }
    };

    const handleChainChanged = (hexChain: string) => {
      if (hexChain) setChainId(parseInt(hexChain, 16));
    };

    if (eth.on) {
      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (eth.removeListener) {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const fetchBalance = async (address: string) => {
    const eth = getEthereumProvider();
    if (!eth) return;
    try {
      const balHex = await eth.request({
        method: "eth_getBalance",
        params: [address, "latest"]
      });
      if (balHex) {
        const balWei = parseInt(balHex, 16);
        setBalance((balWei / 1e18).toFixed(4));
      }
    } catch {
      // Ignore background balance error
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const eth = getEthereumProvider();
      if (!eth) {
        throw new Error("MetaMask or Web3 wallet extension not found in browser.");
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        await fetchBalance(accounts[0]);
      }

      // Check network and switch to Monad Testnet if necessary
      const currentChain = await eth.request({ method: "eth_chainId" });
      if (parseInt(currentChain, 16) !== MONAD_CHAIN_ID) {
        await switchToMonadTestnet();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToMonadTestnet = async () => {
    const eth = getEthereumProvider();
    if (!eth) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_HEX_CHAIN_ID }]
      });
      setChainId(MONAD_CHAIN_ID);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: MONAD_HEX_CHAIN_ID,
                chainName: "Monad Testnet",
                nativeCurrency: {
                  name: "Monad",
                  symbol: "MON",
                  decimals: 18
                },
                rpcUrls: [MONAD_RPC],
                blockExplorerUrls: [MONAD_EXPLORER]
              }
            ]
          });
          setChainId(MONAD_CHAIN_ID);
        } catch (addError: any) {
          setErrorMessage(addError?.message || "Failed to add Monad Testnet");
        }
      } else {
        setErrorMessage(switchError?.message || "Failed to switch chain");
      }
    }
  };

  // Trigger live on-chain negotiation run with Qwen 3.8 Max
  const executeLiveOnChainRun = async () => {
    setIsRunningLive(true);
    setRunLogs([]);
    setRunResult(null);

    try {
      const res = await fetch("/api/onchain/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemDescription: "Tier-1 Low-Latency RPC Streaming Endpoint"
        })
      });
      const data = await res.json();
      if (data.success) {
        setRunLogs(data.logs || []);
        setRunResult(data);
      } else {
        setErrorMessage(data.error || "Execution failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to run on-chain negotiation.");
    } finally {
      setIsRunningLive(false);
    }
  };

  const isMonadChain = chainId === MONAD_CHAIN_ID;

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "5rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Link href="/" style={{ color: "var(--neon-cyan)" }}>Home</Link>
            <ChevronRight size={14} />
            <span>Live On-Chain Arena</span>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Zap color="var(--neon-purple)" size={32} />
            Live Monad Testnet Arena
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.4rem", maxWidth: "680px" }}>
            Real-time on-chain execution with ERC-8004 identity verification, reputation attestations, and bilateral smart contract settlement on Monad (Chain ID 10143).
          </p>
        </div>

        {/* Faucet Link & Switch */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a 
            href="https://testnet.monad.xyz/" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Coins size={16} color="var(--neon-amber)" />
            Monad Faucet ↗
          </a>
        </div>
      </div>

      {errorMessage && (
        <div 
          style={{ 
            background: "rgba(244, 63, 94, 0.1)", 
            border: "1px solid rgba(244, 63, 94, 0.3)", 
            color: "#fb7185", 
            padding: "0.85rem 1.25rem", 
            borderRadius: "var(--radius-md)", 
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: "0.9rem" }}>{errorMessage}</span>
        </div>
      )}

      {/* Web3 Wallet Status Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "1.5rem", 
          borderRadius: "var(--radius-lg)", 
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(0, 240, 255, 0.04))"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div 
            style={{ 
              width: "52px", 
              height: "52px", 
              borderRadius: "50%", 
              background: walletAddress ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
              border: `2px solid ${walletAddress ? "var(--neon-emerald)" : "rgba(255, 255, 255, 0.1)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Wallet size={24} color={walletAddress ? "var(--neon-emerald)" : "var(--text-muted)"} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : "No Wallet Connected"}
              </span>
              {walletAddress && isMonadChain && (
                <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "var(--neon-emerald)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                  Monad 10143
                </span>
              )}
              {walletAddress && !isMonadChain && (
                <span style={{ fontSize: "0.75rem", background: "rgba(244, 63, 94, 0.2)", color: "#fb7185", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                  Wrong Network
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {walletAddress ? (
                <>Connected Balance: <strong style={{ color: "var(--neon-cyan)" }}>{balance ?? "..."} MON</strong></>
              ) : (
                "Connect your MetaMask or Web3 wallet to interact with Monad contracts directly."
              )}
            </div>
          </div>
        </div>

        <div>
          {!walletAddress ? (
            <button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Wallet size={16} />
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          ) : !isMonadChain ? (
            <button 
              onClick={switchToMonadTestnet} 
              className="btn btn-primary"
              style={{ background: "var(--neon-purple)", borderColor: "var(--neon-purple)" }}
            >
              Switch to Monad Testnet (10143)
            </button>
          ) : (
            <button 
              onClick={() => walletAddress && fetchBalance(walletAddress)} 
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RefreshCw size={14} /> Refresh Balance
            </button>
          )}
        </div>
      </div>

      {/* Contract Registry Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <ShieldCheck size={18} color="var(--neon-cyan)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>ERC-8004 Identity</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {identityRegistry}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${identityRegistry}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--neon-cyan)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}
          >
            Inspect on Monadscan <ExternalLink size={12} />
          </a>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Award size={18} color="var(--neon-purple)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Reputation Registry</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {reputationRegistry}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${reputationRegistry}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--neon-purple)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}
          >
            Inspect on Monadscan <ExternalLink size={12} />
          </a>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Layers size={18} color="var(--neon-emerald)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Negotiation.sol Contract</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {negotiationContract}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${negotiationContract}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--neon-emerald)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}
          >
            Inspect on Monadscan <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Main Execution Arena */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem" }}>
        {/* Left Column: Live Run Launcher & Receipts */}
        <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Play size={20} color="var(--neon-cyan)" />
              Live Qwen 3.8 Max Autonomous On-Chain Run
            </h2>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Triggers the complete real-time negotiation loop on Monad Testnet using pre-funded backend wallets. Mints ERC-8004 agent identity tokens, reads trust attestations, deploys escrow, conducts multi-turn bargaining via Qwen, and finalizes on-chain settlement.
          </p>

          <button
            onClick={executeLiveOnChainRun}
            disabled={isRunningLive}
            className="btn btn-primary"
            style={{ 
              width: "100%", 
              padding: "1rem", 
              fontSize: "1.05rem", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "0.75rem",
              marginBottom: "2rem"
            }}
          >
            {isRunningLive ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Executing Monad On-Chain Pipeline (600ms latency)...
              </>
            ) : (
              <>
                <Zap size={20} />
                Execute Live Negotiation on Monad
              </>
            )}
          </button>

          {/* Real-Time On-Chain Transaction Log Stream */}
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "1rem" }}>
              On-Chain Execution Receipts & State Log
            </h3>

            {runLogs.length === 0 && !isRunningLive && (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed rgba(255, 255, 255, 0.1)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Click "Execute Live Negotiation on Monad" above to watch real-time transactions confirm on Monad Testnet.
              </div>
            )}

            {isRunningLive && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--neon-cyan)" }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 1rem auto" }} />
                Submitting transactions and waiting for 600ms Monad block finality...
              </div>
            )}

            {runLogs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {runLogs.map((log, i) => (
                  <div 
                    key={i}
                    style={{
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--neon-cyan)" }}>
                        Step {log.step}: {log.title}
                      </span>
                      <CheckCircle2 size={16} color="var(--neon-emerald)" />
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-main)", margin: 0 }}>
                      {log.detail}
                    </p>

                    {log.txHash && (
                      <a 
                        href={`${MONAD_EXPLORER}/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.75rem", color: "var(--neon-purple)", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.25rem" }}
                      >
                        Tx Hash: {log.txHash.substring(0, 16)}... on Monadscan <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pre-Flight Wallets & Protocol Architecture */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Pre-funded Agent Wallets */}
          <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Coins size={18} color="var(--neon-amber)" />
              Configured Agent Wallets (Monad)
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--neon-cyan)" }}>BUYER AGENT (#2291)</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--neon-emerald)", fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  0x23ee7225F978a99A3a94C11242811deBA369318F
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: "0.3rem" }}>
                  Balance: <strong>4.82 MON</strong>
                </div>
              </div>

              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--neon-purple)" }}>SELLER AGENT (#2292)</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--neon-emerald)", fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  0xDf09e28c592771819cD8F4dE9590097292d18F84
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: "0.3rem" }}>
                  Balance: <strong>4.95 MON</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ERC-8004 Standard Verification Note */}
          <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="var(--neon-cyan)" />
              ERC-8004 Compliance
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              Under ERC-8004, each agent has an autonomous non-fungible identity token minted on Monad. Agents cannot submit feedback on themselves, ensuring verifiable reputation weights across high-frequency bargaining turns.
            </p>
            <div style={{ marginTop: "1.25rem" }}>
              <Link href="/workbench" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                Switch to Simulation Workbench →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
