import type {
  CultivateResponse,
  GltfpackParams,
} from "./types";

export async function fetchPresetCount(): Promise<number> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("Failed to load preset count");
  const data = await res.json();
  return data.presetCount as number;
}

export async function cultivate(file: File): Promise<CultivateResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/cultivate", {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Cultivation failed");
  }

  return data;
}

export async function recultivate(
  workspaceId: string,
  cultivarId: string,
  cultivarName: string,
): Promise<CultivateResponse> {
  const res = await fetch("/api/recultivate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      cultivarId,
      cultivarName,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Re-cultivation failed");
  }

  return data;
}

export async function finetune(
  workspaceId: string,
  cultivarId: string,
  cultivarName: string,
  baseParams: GltfpackParams,
  mode: "variants" | "exact" = "variants",
): Promise<CultivateResponse> {
  const res = await fetch("/api/finetune", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      cultivarId,
      cultivarName,
      baseParams,
      mode,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Fine-tune failed");
  }

  return data;
}

export interface BatchFolderProgress {
  current: number;
  total: number;
  currentFile: string | null;
  ok: number;
  fallbackOriginal: number;
  failed: number;
}

export interface BatchFolderResultSummary {
  processed: number;
  ok: number;
  fallbackOriginal: number;
  failed: number;
}

export interface BatchManifestItem {
  output: string | null;
  originalFile: string;
  status: "ok" | "fallback_original" | "failed";
  originalTriangles: number;
  finalTriangles: number | null;
  finalFileSizeBytes: number | null;
  pass3?: {
    selectedPresetId: string | null;
    fileSizeBytes: number | null;
  };
  error?: string;
}

export interface BatchJobState {
  jobId: string;
  status: "running" | "done" | "error";
  startedAt: string;
  progress: BatchFolderProgress;
  runId: string | null;
  outputUrl: string | null;
  result: (BatchFolderResultSummary & { meta: { runId: string }; items: BatchManifestItem[] }) | null;
  error: string | null;
}

export async function startBatchFromPath(inputDir: string): Promise<string> {
  const res = await fetch("/api/batch/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputDir }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Batch start failed");
  return data.jobId as string;
}

export async function startBatchFromUpload(files: File[]): Promise<string> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file, file.name);
  }
  const res = await fetch("/api/batch/upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Batch upload failed");
  return data.jobId as string;
}

export async function fetchBatchJob(jobId: string): Promise<BatchJobState> {
  const res = await fetch(`/api/batch/jobs/${jobId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load batch job");
  return data as BatchJobState;
}
