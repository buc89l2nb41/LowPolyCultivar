import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { analyzeWithGltfpack, runGltfpack } from "./gltfpack.js";

export interface WorkspaceMeta {
  workspaceId: string;
  originalName: string;
  rootStats: import("./types.js").MeshStats;
  nextBatchIndex: number;
  batches: Array<{
    id: string;
    label: string;
    presetGroupId: string;
    sourceCultivarId: string | null;
    sourceName: string | null;
  }>;
}

export function workspaceDir(dataDir: string, workspaceId: string): string {
  return path.join(dataDir, workspaceId);
}

export function makeCultivarId(
  workspaceId: string,
  batchId: string,
  presetId: string,
): string {
  return `${workspaceId}::${batchId}::${presetId}`;
}

export function parseCultivarId(cultivarId: string): {
  workspaceId: string;
  batchId: string;
  presetId: string;
} {
  const parts = cultivarId.split("::");
  if (parts.length !== 3) {
    throw new Error(`Invalid cultivar id: ${cultivarId}`);
  }
  const [workspaceId, batchId, presetId] = parts;
  return { workspaceId, batchId, presetId };
}

export function resolveCultivarPath(
  dataDir: string,
  cultivarId: string,
): string {
  const { workspaceId, batchId, presetId } = parseCultivarId(cultivarId);
  return path.join(
    workspaceDir(dataDir, workspaceId),
    "batches",
    batchId,
    `${presetId}.glb`,
  );
}

export async function loadMeta(
  dataDir: string,
  workspaceId: string,
): Promise<WorkspaceMeta> {
  const metaPath = path.join(workspaceDir(dataDir, workspaceId), "meta.json");
  const raw = await readFile(metaPath, "utf-8");
  return JSON.parse(raw) as WorkspaceMeta;
}

async function saveMeta(
  dataDir: string,
  meta: WorkspaceMeta,
): Promise<void> {
  const metaPath = path.join(workspaceDir(dataDir, meta.workspaceId), "meta.json");
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
}

export async function initWorkspace(
  dataDir: string,
  uploadPath: string,
  originalName: string,
): Promise<{ meta: WorkspaceMeta; rootStats: Awaited<ReturnType<typeof analyzeWithGltfpack>> }> {
  const workspaceId = `ws-${randomUUID()}`;
  const dir = workspaceDir(dataDir, workspaceId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const rootPath = path.join(dir, "root.glb");

  if (ext === ".glb") {
    await copyFile(uploadPath, rootPath);
  } else {
    await runGltfpack(uploadPath, rootPath, []);
  }

  const rootStats = await analyzeWithGltfpack(rootPath, dir, "root-meta");

  const meta: WorkspaceMeta = {
    workspaceId,
    originalName,
    rootStats,
    nextBatchIndex: 0,
    batches: [],
  };

  await saveMeta(dataDir, meta);

  return { meta, rootStats };
}

export async function nextBatchId(
  dataDir: string,
  workspaceId: string,
): Promise<{ meta: WorkspaceMeta; batchId: string }> {
  const meta = await loadMeta(dataDir, workspaceId);
  const batchId = `batch-${meta.nextBatchIndex}`;
  meta.nextBatchIndex += 1;
  await saveMeta(dataDir, meta);
  return { meta, batchId };
}

export async function registerBatch(
  dataDir: string,
  workspaceId: string,
  batch: WorkspaceMeta["batches"][number],
): Promise<void> {
  const meta = await loadMeta(dataDir, workspaceId);
  meta.batches.push(batch);
  await saveMeta(dataDir, meta);
}

export function rootPreviewUrl(workspaceId: string): string {
  return `/files/${workspaceId}/root.glb`;
}
