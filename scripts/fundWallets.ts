import { createPublicClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { monadTestnet, CONFIG } from "../src/config.js";
import { logger } from "../src/utils/logger.js";

async function checkWallets() {
  logger.header("Checking Agent Wallets on Monad Testnet");

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(CONFIG.rpcUrl),
  });

  const buyerKey = CONFIG.buyerPrivateKey;
  const sellerKey = CONFIG.sellerPrivateKey;

  console.log("Checking Buyer Wallet...");
  if (buyerKey && buyerKey.startsWith("0x") && buyerKey.length === 66) {
    const buyerAccount = privateKeyToAccount(buyerKey);
    const balance = await publicClient.getBalance({ address: buyerAccount.address });
    console.log(`  Buyer Address: ${buyerAccount.address}`);
    console.log(`  Buyer Balance: ${Number(balance) / 1e18} MON`);
  } else {
    const sampleBuyer = generatePrivateKey();
    const acc = privateKeyToAccount(sampleBuyer);
    logger.warn(`Buyer private key not configured in .env`);
    console.log(`  Generated candidate Buyer Key: ${sampleBuyer}`);
    console.log(`  Candidate Buyer Address:       ${acc.address}`);
  }

  console.log("\nChecking Seller Wallet...");
  if (sellerKey && sellerKey.startsWith("0x") && sellerKey.length === 66) {
    const sellerAccount = privateKeyToAccount(sellerKey);
    const balance = await publicClient.getBalance({ address: sellerAccount.address });
    console.log(`  Seller Address: ${sellerAccount.address}`);
    console.log(`  Seller Balance: ${Number(balance) / 1e18} MON`);
  } else {
    const sampleSeller = generatePrivateKey();
    const acc = privateKeyToAccount(sampleSeller);
    logger.warn(`Seller private key not configured in .env`);
    console.log(`  Generated candidate Seller Key: ${sampleSeller}`);
    console.log(`  Candidate Seller Address:       ${acc.address}`);
  }

  console.log("\nTo fund your wallets with testnet MON:");
  console.log("1. Visit https://testnet.monad.xyz/ or Discord faucet");
  console.log("2. Request testnet MON to your agent addresses");
}

checkWallets().catch((err) => {
  logger.error("Wallet check failed", err);
});
