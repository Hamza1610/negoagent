import fs from "fs";
import path from "path";
import { PublicClient, WalletClient, decodeEventLog } from "viem";
import { CONFIG } from "../config.js";

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  model: string;
  endpoints?: Record<string, string>;
}

export function createAgentCardUri(card: AgentCard): string {
  const jsonString = JSON.stringify(card);
  return `data:application/json;utf8,${encodeURIComponent(jsonString)}`;
}

export function parseAgentCardUri(uri: string): AgentCard {
  if (uri.startsWith("data:application/json;utf8,")) {
    const raw = decodeURIComponent(uri.replace("data:application/json;utf8,", ""));
    return JSON.parse(raw);
  }
  return JSON.parse(uri);
}

const identityAbiPath = path.resolve(process.cwd(), "abis", "IdentityRegistry.json");
const identityAbi = JSON.parse(fs.readFileSync(identityAbiPath, "utf8"));

export const identityToolSchemas = [
  {
    type: "function" as const,
    function: {
      name: "register_agent",
      description:
        "Mints a sovereign on-chain identity (ERC-721 token) for this agent in the ERC-8004 Identity Registry on Monad.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Display name of the agent (e.g. 'NEGOagent-Buyer-01')",
          },
          description: {
            type: "string",
            description: "Agent specialization and strategy overview",
          },
        },
        required: ["name", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_agent_identity",
      description:
        "Queries the ERC-8004 Identity Registry to check if this agent address already possesses an on-chain identity token ID.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The Ethereum address to query (defaults to current agent wallet)",
          },
        },
      },
    },
  },
];

/**
 * Register an agent on Monad Testnet via ERC-8004 IdentityRegistry
 */
export async function registerAgent(
  walletClient: WalletClient,
  publicClient: PublicClient,
  card: AgentCard
): Promise<{ success: boolean; agentId?: bigint; txHash?: `0x${string}`; error?: string }> {
  try {
    const account = walletClient.account;
    if (!account) throw new Error("No account connected to walletClient");

    const uri = createAgentCardUri(card);

    // Call register(string)
    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.identityRegistryAddress,
      abi: identityAbi,
      functionName: "register",
      args: [uri],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Find Transfer event from zero address to get tokenId
    let agentId: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded: any = decodeEventLog({
          abi: identityAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Transfer" && decoded.args) {
          const args = decoded.args as { from: string; to: string; tokenId: bigint };
          agentId = args.tokenId;
          break;
        }
      } catch {
        // Continue if event doesn't match ABI
      }
    }

    return {
      success: true,
      agentId,
      txHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Query agent balance or token ID for an address
 */
export async function getAgentIdentity(
  publicClient: PublicClient,
  address: `0x${string}`
): Promise<{ success: boolean; registered: boolean; balance: bigint; tokenId?: bigint; error?: string }> {
  try {
    const balance = (await publicClient.readContract({
      address: CONFIG.identityRegistryAddress,
      abi: identityAbi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    return {
      success: true,
      registered: balance > 0n,
      balance,
    };
  } catch (error: any) {
    return {
      success: false,
      registered: false,
      balance: 0n,
      error: error?.message || String(error),
    };
  }
}
