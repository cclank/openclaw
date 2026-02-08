import fs from "node:fs";
import { loadCostUsageSummary } from "./src/infra/session-cost-usage.js";
import { formatTokenCount, formatUsd } from "./src/utils/usage-format.js";

async function main() {
  const config = JSON.parse(fs.readFileSync("/root/.openclaw/openclaw.json", "utf-8"));
  const durationMs = 24 * 60 * 60 * 1000;
  const startMs = Date.now() - durationMs;

  const summary = await loadCostUsageSummary({
    startMs,
    endMs: Date.now(),
    config,
  });

  console.log("=== 24h Usage Summary ===");
  console.log(`Total Cost: ${formatUsd(summary.totals.totalCost)}`);
  console.log(`Total Tokens: ${formatTokenCount(summary.totals.totalTokens)}`);
  console.log("\n=== By Model ===");
  summary.models.forEach((m) => {
    console.log(
      `- ${m.model}: ${formatTokenCount(m.totalTokens)} tokens, ${formatUsd(m.totalCost)} cost, ${m.sessionCount} sessions`,
    );
  });
}

main().catch(console.error);
