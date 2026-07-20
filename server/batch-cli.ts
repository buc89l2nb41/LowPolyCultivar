#!/usr/bin/env node
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runBatchFolder } from "./batchPipeline.js";
import { OUTPUT_BASE_DIR } from "./batchPaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(PROJECT_ROOT, "data");

function printUsage(): void {
  console.log(`Usage: npm run batch -- --in <folder-with-glb-files>

Output: ${OUTPUT_BASE_DIR}/<YYYY-MM-DD_HHMMSS>/
  - one .glb per input (same basename)
  - manifest.jsonl (per-file status)
  - batch.json (run metadata)

Pipeline per file:
  Generate All → sprite compare → Re-cultivate → sprite compare → texture (유사·주의) → smallest file
  If no acceptable candidates: texture-optimize original root.glb
  On error: log and continue next file`);
}

function parseInputDir(argv: string[]): string {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in" && argv[i + 1]) {
      return path.resolve(argv[i + 1]);
    }
    if (argv[i] === "--help" || argv[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }
  throw new Error("Missing required --in <folder>");
}

async function main(): Promise<void> {
  const inputDir = parseInputDir(process.argv.slice(2));
  await mkdir(DATA_DIR, { recursive: true });

  console.log(`Input:  ${inputDir}`);
  console.log(`Output: ${OUTPUT_BASE_DIR}/<run-id>/`);
  console.log("Starting batch…\n");

  const result = await runBatchFolder(DATA_DIR, inputDir);

  console.log("\nBatch complete");
  console.log(`Run:      ${result.meta.runId}`);
  console.log(`Folder:   ${result.meta.runDir}`);
  console.log(`Files:    ${result.processed} processed`);
  console.log(`  ok:               ${result.ok}`);
  console.log(`  fallback_original: ${result.fallbackOriginal}`);
  console.log(`  failed:           ${result.failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
