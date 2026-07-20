import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import {
  runBatchFolder,
  type BatchFolderProgress,
  type BatchFolderResult,
} from "./batchPipeline.js";

export type BatchJobStatus = "running" | "done" | "error";

export interface BatchJobState {
  jobId: string;
  status: BatchJobStatus;
  startedAt: string;
  progress: BatchFolderProgress;
  runId: string | null;
  outputUrl: string | null;
  result: BatchFolderResult | null;
  error: string | null;
}

const jobs = new Map<string, BatchJobState>();

export function getBatchJob(jobId: string): BatchJobState | undefined {
  return jobs.get(jobId);
}

export function startBatchJob(
  dataDir: string,
  inputDir: string,
  cleanupDirs: string[] = [],
): string {
  const jobId = randomUUID();
  const state: BatchJobState = {
    jobId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      current: 0,
      total: 0,
      currentFile: null,
      ok: 0,
      fallbackOriginal: 0,
      failed: 0,
    },
    runId: null,
    outputUrl: null,
    result: null,
    error: null,
  };
  jobs.set(jobId, state);

  void (async () => {
    try {
      const result = await runBatchFolder(dataDir, inputDir, {
        onProgress: (progress) => {
          state.progress = progress;
        },
      });
      state.status = "done";
      state.result = result;
      state.runId = result.meta.runId;
      state.outputUrl = `/output/${result.meta.runId}/`;
      state.progress = {
        current: result.processed,
        total: result.processed,
        currentFile: null,
        ok: result.ok,
        fallbackOriginal: result.fallbackOriginal,
        failed: result.failed,
      };
    } catch (error) {
      state.status = "error";
      state.error = error instanceof Error ? error.message : String(error);
    } finally {
      for (const dir of cleanupDirs) {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  })();

  return jobId;
}
