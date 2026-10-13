/**
 * Terminal UI and structured logger for NEGOagent
 */

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

export const logger = {
  header(title: string) {
    const line = "=".repeat(64);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  ${title.toUpperCase()}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },

  step(stepNumber: number, title: string) {
    console.log(
      `\n${colors.bold}${colors.yellow}[STEP ${stepNumber}]${colors.reset} ${colors.bold}${title}${colors.reset}`
    );
  },

  agent(role: "BUYER" | "SELLER", message: string) {
    const badge =
      role === "BUYER"
        ? `${colors.bold}${colors.blue}[BUYER (Qwen)]${colors.reset}`
        : `${colors.bold}${colors.magenta}[SELLER (Qwen)]${colors.reset}`;
    console.log(`${badge} ${message}`);
  },

  toolCall(toolName: string, args: Record<string, unknown>) {
    console.log(
      `  ${colors.green}⚙ Calling Tool:${colors.reset} ${colors.bold}${toolName}${colors.reset}`
    );
    console.log(
      `  ${colors.gray}Params: ${JSON.stringify(args, (_, v) => (typeof v === "bigint" ? v.toString() : v))}${colors.reset}`
    );
  },

  tx(description: string, txHash: string) {
    console.log(`  ${colors.green}✔ Transaction Sent:${colors.reset} ${description}`);
    console.log(
      `  ${colors.dim}🔗 Monadscan: https://testnet.monadscan.com/tx/${txHash}${colors.reset}`
    );
  },

  state(stateDesc: string) {
    console.log(`  ${colors.cyan}ℹ State Update:${colors.reset} ${stateDesc}`);
  },

  success(message: string) {
    console.log(`\n${colors.bold}${colors.green}✔ SUCCESS: ${message}${colors.reset}`);
  },

  warn(message: string) {
    console.log(`${colors.yellow}⚠ WARNING: ${message}${colors.reset}`);
  },

  error(message: string, error?: unknown) {
    console.error(`\n${colors.bold}${colors.red}✖ ERROR: ${message}${colors.reset}`);
    if (error) {
      console.error(error);
    }
  },
};
