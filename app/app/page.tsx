"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChevronRight,
  Copy,
  Check,
  Power
} from "lucide-react";

const MONAD_CHAIN_ID = 10143;
const MONAD_HEX_CHAIN_ID = "0x279f";
const MONAD_RPC = "https://testnet-rpc.monad.xyz";
const MONAD_EXPLORER = "https://testnet.monadscan.com";

// Demo agent wallet address on Monad Testnet (funded with ~4.8 MON)
const DEMO_AGENT_ADDRESS = "0x23ee7225F978a99A3a94C11242811deBA369318F";

function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  const anyWin = window as any;
  if (!anyWin.ethereum) return null;

  // Handle multi-wallet setups (MetaMask, Phantom, Rabby, Coinbase)
  if (Array.isArray(anyWin.ethereum.providers) && anyWin.ethereum.providers.length > 0) {
    // Priority: Real MetaMask
    const mm = anyWin.ethereum.providers.find((p: any) => p.isMetaMask && !p.isPhantom);
    if (mm) return mm;
    // Fallback: Rabby or any other
    const rabby = anyWin.ethereum.providers.find((p: any) => p.isRabby);
    if (rabby) return rabby;
    return anyWin.ethereum.providers[0];
  }

  return anyWin.ethereum;
}

export default function LiveAppPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Live on-chain runner state
  const [isRunningLive, setIsRunningLive] = useState(false);
  const [runLogs, setRunLogs] = useState<Array<{ step: number; title: string; detail: string; txHash?: string; agentId?: string }>>([]);
  const [runResult, setRunResult] = useState<any>(null);

  // Contract Addresses from environment
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const negotiationContract = "0x37645e013f972aa79fe452b5763c8ae1c7cbee18";

  const fetchBalance = useCallback(async (address: string) => {
    const eth = getInjectedProvider();
    if (!eth) return;
    try {
      const balHex = await eth.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      if (balHex) {
        const balWei = parseInt(balHex, 16);
        setBalance((balWei / 1e18).toFixed(4));
      }
    } catch {
      // Ignore background balance poll failure
    }
  }, []);

  // Listen for account and chain changes once connected
  useEffect(() => {
    const eth = getInjectedProvider();
    if (!eth) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsDemoMode(false);
        fetchBalance(accounts[0]);
      } else {
        setWalletAddress(null);
        setBalance(null);
      }
    };

    const handleChainChanged = (hexChain: string) => {
      if (hexChain) {
        const id = parseInt(hexChain, 16);
        setChainId(id);
        if (walletAddress) fetchBalance(walletAddress);
      }
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
  }, [fetchBalance, walletAddress]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const eth = getInjectedProvider();
      if (!eth) {
        throw new Error("No Web3 wallet extension found. Please install MetaMask or use Demo Wallet below.");
      }

      // Step 1: Request accounts
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts authorized in your wallet.");
      }

      const activeAccount = accounts[0];
      setWalletAddress(activeAccount);
      setIsDemoMode(false);
      await fetchBalance(activeAccount);

      // Step 2: Query network and switch if not Monad Testnet
      try {
        const currentChainHex = await eth.request({ method: "eth_chainId" });
        const currentId = parseInt(currentChainHex, 16);
        setChainId(currentId);

        if (currentId !== MONAD_CHAIN_ID) {
          await switchToMonadTestnet();
        }
      } catch (switchErr: any) {
        console.warn("Chain switch postponed:", switchErr);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToMonadTestnet = async () => {
    const eth = getInjectedProvider();
    if (!eth) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_HEX_CHAIN_ID }],
      });
      setChainId(MONAD_CHAIN_ID);
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
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
                  decimals: 18,
                },
                rpcUrls: [MONAD_RPC],
                blockExplorerUrls: [MONAD_EXPLORER],
              },
            ],
          });
          setChainId(MONAD_CHAIN_ID);
        } catch (addError: any) {
          setErrorMessage(addError?.message || "Failed to add Monad Testnet to wallet.");
        }
      } else {
        setErrorMessage(switchError?.message || "Failed to switch chain to Monad Testnet.");
      }
    }
  };

  const enableDemoWallet = () => {
    setWalletAddress(DEMO_AGENT_ADDRESS);
    setBalance("4.8213");
    setChainId(MONAD_CHAIN_ID);
    setIsDemoMode(true);
    setErrorMessage(null);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setBalance(null);
    setChainId(null);
    setIsDemoMode(false);
  };

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger live on-chain negotiation run with Qwen 3.8 Max
  const executeLiveOnChainRun = async () => {
    setIsRunningLive(true);
    setRunLogs([]);
    setRunResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/onchain/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemDescription: "Tier-1 Low-Latency RPC Streaming Endpoint",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRunLogs(data.logs || []);
        setRunResult(data);
      } else {
        setErrorMessage(data.error || "Execution failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute on-chain negotiation.");
    } finally {
      setIsRunningLive(false);
    }
  };

  const isMonadChain = chainId === MONAD_CHAIN_ID;

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Link href="/" style={{ color: "var(--text-secondary)" }}>Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: "var(--text-main)" }}>Live On-Chain Arena</span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Zap color="var(--seller-violet)" size={24} />
            Live Monad Testnet Arena
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.3rem", fontSize: "0.9rem", maxWidth: "680px" }}>
            Execute real-time smart contracts on Monad Testnet (Chain ID 10143) with ERC-8004 identity tokens, reputation feedback, and bilateral escrow settlement.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a 
            href="https://testnet.monad.xyz/" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem" }}
          >
            <Coins size={15} color="var(--status-amber)" />
            Monad Faucet ↗
          </a>
        </div>
      </div>

      {errorMessage && (
        <div 
          style={{ 
            background: "rgba(244, 63, 94, 0.08)", 
            border: "1px solid rgba(244, 63, 94, 0.25)", 
            color: "#fb7185", 
            padding: "0.85rem 1.25rem", 
            borderRadius: "var(--radius-sm)", 
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: "0.875rem" }}>{errorMessage}</span>
        </div>
      )}

      {/* Web3 Wallet Connection Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "1.25rem 1.5rem", 
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          background: "var(--bg-surface)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div 
            style={{ 
              width: "44px", 
              height: "44px", 
              borderRadius: "var(--radius-sm)", 
              background: walletAddress ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${walletAddress ? "var(--status-emerald)" : "var(--border-subtle)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Wallet size={20} color={walletAddress ? "var(--status-emerald)" : "var(--text-muted)"} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : "No Wallet Connected"}
              </span>

              {walletAddress && (
                <button 
                  onClick={copyAddress} 
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Copy address"
                >
                  {copied ? <Check size={14} color="var(--status-emerald)" /> : <Copy size={14} />}
                </button>
              )}

              {walletAddress && isMonadChain && (
                <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--status-emerald)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                  {isDemoMode ? "Demo Mode (Monad 10143)" : "Monad 10143 Connected"}
                </span>
              )}

              {walletAddress && !isMonadChain && (
                <span style={{ fontSize: "0.7rem", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                  Wrong Network
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {walletAddress ? (
                <>Balance: <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>{balance ?? "..."} MON</strong></>
              ) : (
                "Connect MetaMask or use pre-funded Demo Agent Wallet to interact with Monad contracts."
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {!walletAddress ? (
            <>
              <button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="btn btn-primary"
              >
                <Wallet size={15} />
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>

              <button 
                onClick={enableDemoWallet} 
                className="btn btn-secondary"
                title="Connect pre-funded testnet wallet with ~4.8 MON"
              >
                Use Demo Wallet
              </button>
            </>
          ) : !isMonadChain ? (
            <>
              <button 
                onClick={switchToMonadTestnet} 
                className="btn btn-primary"
              >
                Switch to Monad (10143)
              </button>
              <button onClick={disconnectWallet} className="btn btn-secondary" title="Disconnect">
                <Power size={14} />
              </button>
            </>
          ) : (
            <>
              {!isDemoMode && (
                <button 
                  onClick={() => walletAddress && fetchBalance(walletAddress)} 
                  className="btn btn-secondary"
                  title="Refresh balance"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              )}
              <button onClick={disconnectWallet} className="btn btn-secondary" title="Disconnect">
                <Power size={14} /> Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contract Registry Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <ShieldCheck size={16} color="var(--buyer-cyan)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>ERC-8004 Identity Registry</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {identityRegistry}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${identityRegistry}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--buyer-cyan)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.4rem" }}
          >
            Monadscan Explorer <ExternalLink size={12} />
          </a>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <ShieldCheck size={16} color="var(--seller-violet)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Reputation Registry</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {reputationRegistry}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${reputationRegistry}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--seller-violet)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.4rem" }}
          >
            Monadscan Explorer <ExternalLink size={12} />
          </a>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <Layers size={16} color="var(--status-emerald)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Negotiation.sol Escrow</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {negotiationContract}
          </div>
          <a 
            href={`${MONAD_EXPLORER}/address/${negotiationContract}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--status-emerald)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.4rem" }}
          >
            Monadscan Explorer <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Main Execution Arena */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
        {/* Left Column: Live Run Launcher & Receipts */}
        <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Play size={18} color="var(--text-main)" />
              Live Qwen 3.8 Max On-Chain Execution
            </h2>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Runs the full autonomous negotiation pipeline on Monad Testnet: verifies ERC-8004 tokens, locks escrow in <code>Negotiation.sol</code>, executes multi-turn Qwen counter-offers, and submits post-settlement reputation feedback.
          </p>

          <button
            onClick={executeLiveOnChainRun}
            disabled={isRunningLive}
            className="btn btn-primary"
            style={{ 
              width: "100%", 
              padding: "0.75rem", 
              fontSize: "0.95rem", 
              marginBottom: "1.75rem"
            }}
          >
            {isRunningLive ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Executing on Monad Testnet (600ms latency)...
              </>
            ) : (
              <>
                <Zap size={16} />
                Execute On-Chain Negotiation
              </>
            )}
          </button>

          {/* Real-Time On-Chain Transaction Log Stream */}
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.75rem" }}>
              Execution Receipts & State Log
            </h3>

            {runLogs.length === 0 && !isRunningLive && (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-medium)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Click "Execute On-Chain Negotiation" to broadcast transactions to Monad Testnet.
              </div>
            )}

            {isRunningLive && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 0.75rem auto", color: "var(--buyer-cyan)" }} />
                Waiting for sub-second Monad block confirmations...
              </div>
            )}

            {runLogs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {runLogs.map((log, i) => (
                  <div 
                    key={i}
                    style={{
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.85rem 1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                        Step {log.step}: {log.title}
                      </span>
                      <CheckCircle2 size={15} color="var(--status-emerald)" />
                    </div>

                    <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", margin: 0 }}>
                      {log.detail}
                    </p>

                    {log.txHash && (
                      <a 
                        href={`${MONAD_EXPLORER}/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.75rem", color: "var(--buyer-cyan)", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}
                      >
                        Tx: {log.txHash.substring(0, 18)}... on Monadscan <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pre-Funded Wallets & Architecture */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Coins size={16} color="var(--status-amber)" />
              Backend Agent Wallets (Monad)
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--buyer-cyan)" }}>BUYER AGENT (#2291)</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--status-emerald)", fontWeight: 500 }}>Funded</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  0x23ee7225F978a99A3a94C11242811deBA369318F
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: "0.25rem" }}>
                  Balance: <strong>4.82 MON</strong>
                </div>
              </div>

              <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--seller-violet)" }}>SELLER AGENT (#2292)</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--status-emerald)", fontWeight: 500 }}>Funded</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  0xDf09e28c592771819cD8F4dE9590097292d18F84
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: "0.25rem" }}>
                  Balance: <strong>4.95 MON</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} color="var(--buyer-cyan)" />
              ERC-8004 Verification
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
              Under ERC-8004, each agent has an autonomous non-fungible identity token minted on Monad. Agents cannot submit feedback on themselves, ensuring verifiable reputation weights across high-frequency bargaining turns.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <Link href="/workbench" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}>
                Open Visual Simulation Workbench →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
