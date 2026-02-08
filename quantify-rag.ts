import fs from "node:fs";
import path from "node:path";

async function runQuantification() {
  const memoryPath = "/root/.openclaw/workspace/MEMORY.md";
  const memoryExists = fs.existsSync(memoryPath);
  const memorySize = memoryExists ? fs.statSync(memoryPath).size : 0;
  const memoryChars = memoryExists ? fs.readFileSync(memoryPath, "utf-8").length : 0;

  // Assume 1 token per 4 chars for a rough estimate
  const memoryTokens = Math.ceil(memoryChars / 4);

  console.log("=== Memory Usage Quantification ===");
  console.log(`Full MEMORY.md injection: ~${memoryTokens} tokens per message`);

  const searchSnippetTokens = 200; // Average snippet size
  const numSnippets = 3;
  const ragTokens = searchSnippetTokens * numSnippets;

  console.log(`On-demand retrieval (3 snippets): ~${ragTokens} tokens per message`);
  const savings =
    memoryTokens > ragTokens ? (((memoryTokens - ragTokens) / memoryTokens) * 100).toFixed(1) : 0;
  console.log(`Potential Savings: ${savings}%`);

  if (memoryTokens > 5000) {
    console.log("CRITICAL: Full injection is extremely expensive for this session.");
  }
}

runQuantification().catch(console.error);
