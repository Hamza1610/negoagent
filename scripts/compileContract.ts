import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";

function compile() {
  const contractPath = path.resolve(process.cwd(), "contracts", "Negotiation.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "Negotiation.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  console.log("Compiling contracts/Negotiation.sol...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error("Compilation error:", error.formattedMessage);
        hasError = true;
      } else {
        console.warn("Compilation warning:", error.formattedMessage);
      }
    }
    if (hasError) {
      process.exit(1);
    }
  }

  const contract = output.contracts["Negotiation.sol"]["Negotiation"];
  const abi = contract.abi;
  const bytecode = "0x" + contract.evm.bytecode.object;

  const abisDir = path.resolve(process.cwd(), "abis");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(abisDir, "Negotiation.json"),
    JSON.stringify(abi, null, 2)
  );

  fs.writeFileSync(
    path.join(abisDir, "NegotiationBytecode.json"),
    JSON.stringify({ bytecode }, null, 2)
  );

  console.log("Successfully compiled Negotiation.sol!");
  console.log(`ABI saved to: ${path.join(abisDir, "Negotiation.json")}`);
  console.log(`Bytecode saved to: ${path.join(abisDir, "NegotiationBytecode.json")}`);
}

compile();
