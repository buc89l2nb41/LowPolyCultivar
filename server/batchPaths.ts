import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 프로젝트 루트의 output/ — 배치 실행마다 타임스탬프 하위 폴더 생성 */
export const OUTPUT_BASE_DIR = path.resolve(__dirname, "../output");

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatRunId(date = new Date()): string {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-") + `_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

export async function createRunOutputDir(runId?: string): Promise<{
  runId: string;
  runDir: string;
}> {
  const id = runId ?? formatRunId();
  const runDir = path.join(OUTPUT_BASE_DIR, id);
  await mkdir(runDir, { recursive: true });
  return { runId: id, runDir };
}
