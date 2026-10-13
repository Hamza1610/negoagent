import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEGOagent | Autonomous AI Economic Negotiation on Monad",
  description:
    "Autonomous multi-turn economic negotiation driven by Qwen 3.8 Max with portable ERC-8004 identity and verifiable on-chain reputation on Monad.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Global Navigation Header */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(7, 9, 14, 0.85)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--cyan-primary), var(--purple-primary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#050b14",
                fontSize: "1.1rem",
                boxShadow: "0 0 16px rgba(0, 242, 254, 0.35)",
              }}
            >
              N
            </div>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#fff",
                }}
              >
                NEGO<span style={{ color: "var(--cyan-primary)" }}>agent</span>
              </span>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                ERC-8004 • MONAD
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
            }}
          >
            <Link
              href="/"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.92rem",
                transition: "color 0.2s",
              }}
            >
              Home
            </Link>
            <Link
              href="/workbench"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.92rem",
                transition: "color 0.2s",
              }}
            >
              Workbench
            </Link>
            <Link
              href="/workbench/agents"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.92rem",
                transition: "color 0.2s",
              }}
            >
              Agents Board
            </Link>
            <Link
              href="/workbench/history"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.92rem",
                transition: "color 0.2s",
              }}
            >
              History
            </Link>
            <Link
              href="/app"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.92rem",
                transition: "color 0.2s",
              }}
            >
              Live On-Chain
            </Link>
          </nav>

          {/* Right Header Status Badges & Quick Action */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "6px", 
                fontSize: "0.75rem", 
                padding: "0.3rem 0.65rem", 
                borderRadius: "var(--radius-full)", 
                background: "rgba(139, 92, 246, 0.1)", 
                border: "1px solid rgba(139, 92, 246, 0.25)",
                color: "#c4b5fd" 
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--seller-violet)",
                }}
              />
              Monad 10143
            </div>

            <Link href="/workbench" className="btn btn-primary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}>
              Launch Workbench
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>

        {/* Global Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "40px 32px",
            marginTop: "80px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>NEGOagent</span> — Autonomous Multi-Turn AI Negotiation on Monad
          </div>
          <div>
            Powered by Alibaba Cloud Qwen 3.8 Max • ERC-8004 Trustless Agents Standard • Monad Testnet (600ms Finality)
          </div>
        </footer>
      </body>
    </html>
  );
}
