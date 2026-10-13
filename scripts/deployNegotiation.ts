import fs from "fs";
import path from "path";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, CONFIG } from "../src/config.js";
import { logger } from "../src/utils/logger.js";

async function deploy() {
  logger.header("Deploying Negotiation Contract to Monad Testnet");

  const privateKey = (CONFIG.buyerPrivateKey || process.env.DEPLOYER_PRIVATE_KEY) as `0x${string}`;
  if (!privateKey || !privateKey.startsWith("0x")) {
    logger.error("No valid BUYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY found in .env");
    logger.warn("Please set BUYER_PRIVATE_KEY=0x... in your .env file.");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(CONFIG.rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(CONFIG.rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Address: ${account.address}`);
  console.log(`Deployer Balance: ${balance.toString()} wei (${Number(balance) / 1e18} MON)`);

  if (balance === 0n) {
    logger.error("Deployer balance is 0 MON. Fund your wallet using the Monad Testnet Faucet:");
    logger.warn("https://testnet.monad.xyz/ or https://faucet.monad.xyz");
    process.exit(1);
  }

  const bytecodePath = path.resolve(process.cwd(), "abis", "NegotiationBytecode.json");
  const abiPath = path.resolve(process.cwd(), "abis", "Negotiation.json");

  const { bytecode } = JSON.parse(fs.readFileSync(bytecodePath, "utf8"));
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

  console.log("Submitting deployment transaction to Monad Testnet...");
  const txHash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
  });

  logger.tx("Deployment transaction broadcasted", txHash);
  console.log("Waiting for receipt (~600ms finality on Monad)...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (!receipt.contractAddress) {
    logger.error("Deployment failed: No contract address in receipt");
    process.exit(1);
  }

  logger.success(`Negotiation contract deployed at: ${receipt.contractAddress}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Explorer Link: https://testnet.monadscan.com/address/${receipt.contractAddress}`);

  // Update .env file if it exists
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("NEGOTIATION_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /NEGOTIATION_CONTRACT_ADDRESS=.*/,
        `NEGOTIATION_CONTRACT_ADDRESS=${receipt.contractAddress}`
      );
    } else {
      envContent += `\nNEGOTIATION_CONTRACT_ADDRESS=${receipt.contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated NEGOTIATION_CONTRACT_ADDRESS in .env`);
  }
}

deploy().catch((err) => {
  logger.error("Deployment crashed", err);
  process.exit(1);
});
