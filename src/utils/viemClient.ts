import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount, PrivateKeyAccount } from "viem/accounts";
import { monadTestnet, CONFIG } from "../config.js";

let publicClientInstance: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!publicClientInstance) {
    publicClientInstance = createPublicClient({
      chain: monadTestnet,
      transport: http(CONFIG.rpcUrl),
    });
  }
  return publicClientInstance;
}

export function getAccount(privateKey: `0x${string}`): PrivateKeyAccount {
  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error("Invalid private key. Must be a 32-byte hex string starting with 0x");
  }
  return privateKeyToAccount(privateKey);
}

export function getWalletClient(privateKey: `0x${string}`): WalletClient {
  const account = getAccount(privateKey);
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(CONFIG.rpcUrl),
  });
}
