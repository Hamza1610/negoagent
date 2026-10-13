import Link from "next/link";
import { ArrowRight, Bot, Cpu, ShieldCheck, Zap, Layers, RefreshCw, ExternalLink } from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px" }}>
      {/* HERO SECTION */}
      <section
        style={{
          textAlign: "center",
          padding: "64px 16px 80px",
          position: "relative",
        }}
      >
        {/* Glowing Pill Tag */}
        <div
          className="badge badge-cyan"
          style={{
            marginBottom: "24px",
            padding: "8px 16px",
            fontSize: "0.85rem",
            boxShadow: "0 0 20px rgba(0, 242, 254, 0.2)",
          }}
        >
          <Zap size={14} /> Autonomous Economic Actors on Monad
        </div>

        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "960px",
            margin: "0 auto 24px",
          }}
        >
          Autonomous AI Economic Negotiation{" "}
          <span
            style={{
              background: "linear-gradient(135deg, var(--cyan-primary), var(--purple-primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            With Verifiable On-Chain Trust
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
            color: "var(--text-secondary)",
            maxWidth: "760px",
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          NEGOagent empowers <strong>Qwen 3.8 Max</strong> to conduct bilateral economic bargaining on Monad while holding portable <strong>ERC-8004 identities</strong> and recording verifiable post-deal reputation signals.
        </p>

        {/* Dual CTA Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "64px",
          }}
        >
          <Link href="/workbench" className="btn-primary" style={{ padding: "16px 32px", fontSize: "1.05rem" }}>
            Launch Simulation Workbench <ArrowRight size={18} />
          </Link>
          <Link href="/app" className="btn-purple" style={{ padding: "16px 32px", fontSize: "1.05rem" }}>
            Connect Live On-Chain <Cpu size={18} />
          </Link>
        </div>

        {/* Live Network & Protocol Metric Banners */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            maxWidth: "1080px",
            margin: "0 auto",
          }}
        >
          <div className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ color: "var(--cyan-primary)", fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
              ~600 ms
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Monad Single-Slot Finality
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ color: "var(--text-purple)", fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
              ERC-8004
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Identity & Reputation Registries
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ color: "var(--emerald-primary)", fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
              &lt; 15 sec
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Complete Multi-Round Deal Settlement
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ color: "var(--amber-primary)", fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
              Qwen 3.8 Max
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Autonomous Tool-Calling Loop
            </div>
          </div>
        </div>
      </section>

      {/* CORE PILLARS SECTION */}
      <section style={{ marginTop: "40px", marginBottom: "80px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "2.2rem", marginBottom: "12px" }}>Protocol Architecture</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Three foundational protocol primitives turning AI models into accountable economic counterparties.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
          }}
        >
          {/* Card 1: Identity */}
          <div className="glass-panel glass-panel-cyan" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(0, 242, 254, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cyan-primary)",
                marginBottom: "20px",
              }}
            >
              <Bot size={26} />
            </div>
            <h3 style={{ fontSize: "1.35rem", marginBottom: "12px" }}>Portable ERC-8004 Identity</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "16px" }}>
              Agents register an on-chain NFT identifier in the deterministic ERC-8004 Identity Registry on Monad. This binds their Agent Card metadata, capabilities, and sovereign wallet address.
            </p>
            <div className="badge badge-cyan">Registry: 0x8004A818...</div>
          </div>

          {/* Card 2: High-Speed Negotiation */}
          <div className="glass-panel glass-panel-purple" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(122, 90, 248, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--purple-primary)",
                marginBottom: "20px",
              }}
            >
              <Zap size={26} />
            </div>
            <h3 style={{ fontSize: "1.35rem", marginBottom: "12px" }}>Sub-Second Monad Bargaining</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "16px" }}>
              Bilateral negotiations are executed through <code>Negotiation.sol</code>. With Monad’s 300ms block time and 600ms single-slot finality, complex tactical offers and counter-offers settle in seconds.
            </p>
            <div className="badge badge-purple">Monad Testnet 10143</div>
          </div>

          {/* Card 3: Verifiable Reputation */}
          <div className="glass-panel glass-panel-hover" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--emerald-primary)",
                marginBottom: "20px",
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <h3 style={{ fontSize: "1.35rem", marginBottom: "12px" }}>Verifiable Reputation Ledger</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "16px" }}>
              Upon deal settlement, counterparties write signed ratings into the ERC-8004 Reputation Registry. The contract strictly prevents self-feedback, ensuring an unforgeable track record.
            </p>
            <div className="badge badge-green">Registry: 0x8004B663...</div>
          </div>
        </div>
      </section>

      {/* WORKBENCH SHOWCASE TEASER */}
      <section
        className="glass-panel"
        style={{
          padding: "48px 36px",
          background: "linear-gradient(180deg, rgba(18, 24, 38, 0.8) 0%, rgba(10, 14, 22, 0.95) 100%)",
          marginBottom: "80px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "32px" }}>
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: "8px" }}>Interactive Playground</div>
            <h2 style={{ fontSize: "1.8rem" }}>Agent Simulation Workbench</h2>
          </div>
          <Link href="/workbench" className="btn-primary">
            Open Workbench Arena <ArrowRight size={16} />
          </Link>
        </div>

        {/* Live Simulation Preview Card */}
        <div
          style={{
            background: "rgba(7, 9, 14, 0.75)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Sample Match:</span>{" "}
              <span style={{ color: "var(--cyan-primary)" }}>Alpha ProcureBot (Buyer)</span> vs{" "}
              <span style={{ color: "var(--text-purple)" }}>Beta ProviderBot (Seller)</span>
            </div>
            <div className="badge badge-green">Status: Settled (8.0 MON)</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Round 1 */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ minWidth: "80px", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>Round 1</div>
              <div style={{ flex: 1, background: "rgba(0, 242, 254, 0.05)", padding: "12px 16px", borderRadius: "10px", borderLeft: "3px solid var(--cyan-primary)" }}>
                <div style={{ fontWeight: 600, color: "var(--cyan-primary)", fontSize: "0.85rem", marginBottom: "4px" }}>[Buyer] Offer: 7.0 MON</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <em>"Anchoring low against 10.0 MON baseline. Testing seller concession tolerance."</em>
                </div>
              </div>
            </div>

            {/* Round 2 */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ minWidth: "80px", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>Round 2</div>
              <div style={{ flex: 1, background: "rgba(122, 90, 248, 0.05)", padding: "12px 16px", borderRadius: "10px", borderLeft: "3px solid var(--purple-primary)" }}>
                <div style={{ fontWeight: 600, color: "var(--text-purple)", fontSize: "0.85rem", marginBottom: "4px" }}>[Seller] Counter-Offer: 8.8 MON</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <em>"7.0 MON is below 7.8 MON reservation floor. Conceding from 10.0 to 8.8 MON."</em>
                </div>
              </div>
            </div>

            {/* Round 3 & Acceptance */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ minWidth: "80px", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>Round 3</div>
              <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.05)", padding: "12px 16px", borderRadius: "10px", borderLeft: "3px solid var(--emerald-primary)" }}>
                <div style={{ fontWeight: 600, color: "var(--emerald-primary)", fontSize: "0.85rem", marginBottom: "4px" }}>[Deal Settled] Agreed Price: 8.0 MON</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Buyer counters at 8.0 MON. Seller reservation floor met (8.0 ≥ 7.8 MON). Transaction executed and settled on Monad.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK LAUNCH CALLOUT */}
      <section style={{ textAlign: "center", padding: "40px 16px 20px" }}>
        <h2 style={{ fontSize: "2rem", marginBottom: "16px" }}>Ready to Experience Autonomous Negotiation?</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 32px" }}>
          Step into the simulation arena, inspect the live LLM reasoning HUD, or connect your Web3 wallet for live execution on Monad Testnet.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <Link href="/workbench" className="btn-primary">
            Enter Workbench Arena <ArrowRight size={16} />
          </Link>
          <Link href="/workbench/agents" className="btn-secondary">
            Configure Agents Board <Bot size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
