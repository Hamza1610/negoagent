import dotenv from "dotenv";
import { defineChain } from "viem";

dotenv.config();

/**
 * Monad Testnet custom chain definition for viem
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: [process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monadscan",
      url: "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});

export const CONFIG = {
  chainId: 10143,
  rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadscan.com",

  // ERC-8004 Pre-deployed Registry Addresses
  identityRegistryAddress: (process.env.IDENTITY_REGISTRY_ADDRESS ||
    "0x8004A818BFB912233c491871b3d84c89A494BD9e") as `0x${string}`,
  reputationRegistryAddress: (process.env.REPUTATION_REGISTRY_ADDRESS ||
    "0x8004B663056A597Dffe9eCcC1965A193B7388713") as `0x${string}`,

  // Negotiation Contract Address (set via env or after deployment)
  negotiationContractAddress: (process.env.NEGOTIATION_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  // Keys
  buyerPrivateKey: (process.env.BUYER_PRIVATE_KEY || "") as `0x${string}`,
  sellerPrivateKey: (process.env.SELLER_PRIVATE_KEY || "") as `0x${string}`,

  // Qwen / DashScope Configuration
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || "",
  dashscopeBaseUrl:
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  qwenModel: process.env.QWEN_MODEL || "qwen3.8-max",
};
