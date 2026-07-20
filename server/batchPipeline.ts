import { appendFile, copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";

import path from "node:path";

import {

  cultivateNewWorkspace,

  recultivateFromSelection,

} from "./cultivate.js";

import { closeSpriteBrowser, runSpriteCompare } from "./spriteCompare.js";

import { selectSimilarLowestTriangles, SPRITE_THRESHOLDS } from "./spriteStatus.js";

import {

  ALL_PRESET_COUNT,

  TEXTURE_OPTIMIZATION_PRESET_COUNT,

} from "./presets.js";

import { runTexturePassPickSmallest } from "./texturePass.js";

import { resolveCultivarPath, workspaceDir } from "./workspace.js";

import type { CultivarResult } from "./types.js";

import type { SpriteEntryResult } from "./spriteCompare.js";

import { createRunOutputDir } from "./batchPaths.js";

import type { TextureCandidate } from "./texturePass.js";



export type BatchItemStatus = "ok" | "fallback_original" | "failed";



export interface BatchPassSummary {

  selectedId: string | null;

  selectedName: string | null;

  maxDiff: number | null;

  meanDiff: number | null;

  triangles: number | null;

  skipped?: boolean;

  reason?: string;

}



export interface BatchTexturePassSummary {

  selectedPresetId: string | null;

  fileSizeBytes: number | null;

  candidates: TextureCandidate[];

}



export interface BatchManifestEntry {

  runId: string;

  source: string;

  output: string | null;

  originalFile: string;

  status: BatchItemStatus;

  originalTriangles: number;

  finalTriangles: number | null;

  finalFileSizeBytes: number | null;

  pass1: BatchPassSummary;

  pass2: BatchPassSummary;

  pass3: BatchTexturePassSummary;

  durationSec: number;

  error?: string;

}



export interface BatchRunMeta {

  runId: string;

  runDir: string;

  inputDir: string;

  startedAt: string;

  presetCount: number;

  texturePresetCount: number;

  spriteThresholds: typeof SPRITE_THRESHOLDS;

}



function summarizeSelection(

  selected: { cultivar: CultivarResult; sprite: SpriteEntryResult } | null,

  extra?: Partial<BatchPassSummary>,

): BatchPassSummary {

  if (!selected) {

    return {

      selectedId: null,

      selectedName: null,

      maxDiff: null,

      meanDiff: null,

      triangles: null,

      ...extra,

    };

  }

  return {

    selectedId: selected.cultivar.id,

    selectedName: selected.cultivar.name,

    maxDiff: selected.sprite.maxDiff,

    meanDiff: selected.sprite.meanDiff,

    triangles: selected.cultivar.stats.triangles,

    ...extra,

  };

}



const emptyPass3 = (): BatchTexturePassSummary => ({

  selectedPresetId: null,

  fileSizeBytes: null,

  candidates: [],

});



async function runSpriteForCultivars(

  dataDir: string,

  workspaceId: string,

  cultivars: CultivarResult[],

) {

  return runSpriteCompare(dataDir, {

    workspaceId,

    entries: cultivars.map((cultivar, index) => ({

      id: cultivar.id,

      rank: index + 2,

    })),

  });

}



async function appendManifest(

  runDir: string,

  entry: BatchManifestEntry,

): Promise<void> {

  await appendFile(

    path.join(runDir, "manifest.jsonl"),

    `${JSON.stringify(entry)}\n`,

    "utf-8",

  );

}



function rootPath(dataDir: string, workspaceId: string): string {

  return path.join(workspaceDir(dataDir, workspaceId), "root.glb");

}



async function finalizeWithTexturePass(

  geometryPath: string,

  workspaceId: string,

  dataDir: string,

  outputPath: string,

): Promise<{

  pass3: BatchTexturePassSummary;

  finalFileSizeBytes: number;

}> {

  const textureDir = path.join(

    workspaceDir(dataDir, workspaceId),

    "texture-pass",

  );

  const texture = await runTexturePassPickSmallest(geometryPath, textureDir);

  await copyFile(texture.outputPath, outputPath);

  return {

    pass3: {

      selectedPresetId: texture.selectedPresetId,

      fileSizeBytes: texture.fileSizeBytes,

      candidates: texture.candidates,

    },

    finalFileSizeBytes: texture.fileSizeBytes,

  };

}



export async function runSingleFilePipeline(

  dataDir: string,

  inputPath: string,

  runDir: string,

  runId: string,

): Promise<BatchManifestEntry> {

  const started = Date.now();

  const outputName = path.basename(inputPath);

  const outputPath = path.join(runDir, outputName);

  const originalName = path.basename(inputPath);



  let workspaceId: string | null = null;



  try {

    const pass1 = await cultivateNewWorkspace(dataDir, inputPath, originalName);

    workspaceId = pass1.workspaceId;

    const originalTriangles = pass1.rootOriginal.stats.triangles;



    const sprite1 = await runSpriteForCultivars(

      dataDir,

      workspaceId,

      pass1.batch.cultivars,

    );

    const pick1 = selectSimilarLowestTriangles(

      pass1.batch.cultivars,

      sprite1.entries,

    );



    if (!pick1) {

      const { pass3, finalFileSizeBytes } = await finalizeWithTexturePass(

        rootPath(dataDir, workspaceId),

        workspaceId,

        dataDir,

        outputPath,

      );

      const entry: BatchManifestEntry = {

        runId,

        source: inputPath,

        output: outputName,

        originalFile: outputName,

        status: "fallback_original",

        originalTriangles,

        finalTriangles: originalTriangles,

        finalFileSizeBytes,

        pass1: summarizeSelection(null, {

          skipped: true,

          reason: "no_similar_candidates",

        }),

        pass2: summarizeSelection(null, {

          skipped: true,

          reason: "pass1_fallback_original",

        }),

        pass3,

        durationSec: Math.round((Date.now() - started) / 1000),

      };

      await appendManifest(runDir, entry);

      return entry;

    }



    const pass2 = await recultivateFromSelection(

      dataDir,

      workspaceId,

      pick1.cultivar.id,

      pick1.cultivar.name,

    );



    const sprite2 = await runSpriteForCultivars(

      dataDir,

      workspaceId,

      pass2.batch.cultivars,

    );

    const pick2 = selectSimilarLowestTriangles(

      pass2.batch.cultivars,

      sprite2.entries,

    );



    if (!pick2) {

      const { pass3, finalFileSizeBytes } = await finalizeWithTexturePass(

        rootPath(dataDir, workspaceId),

        workspaceId,

        dataDir,

        outputPath,

      );

      const entry: BatchManifestEntry = {

        runId,

        source: inputPath,

        output: outputName,

        originalFile: outputName,

        status: "fallback_original",

        originalTriangles,

        finalTriangles: originalTriangles,

        finalFileSizeBytes,

        pass1: summarizeSelection(pick1),

        pass2: summarizeSelection(null, {

          skipped: true,

          reason: "no_similar_candidates",

        }),

        pass3,

        durationSec: Math.round((Date.now() - started) / 1000),

      };

      await appendManifest(runDir, entry);

      return entry;

    }



    const geometryPath = resolveCultivarPath(dataDir, pick2.cultivar.id);

    const { pass3, finalFileSizeBytes } = await finalizeWithTexturePass(

      geometryPath,

      workspaceId,

      dataDir,

      outputPath,

    );



    const entry: BatchManifestEntry = {

      runId,

      source: inputPath,

      output: outputName,

      originalFile: outputName,

      status: "ok",

      originalTriangles,

      finalTriangles: pick2.cultivar.stats.triangles,

      finalFileSizeBytes,

      pass1: summarizeSelection(pick1),

      pass2: summarizeSelection(pick2),

      pass3,

      durationSec: Math.round((Date.now() - started) / 1000),

    };

    await appendManifest(runDir, entry);

    return entry;

  } catch (error) {

    const message = error instanceof Error ? error.message : String(error);

    const entry: BatchManifestEntry = {

      runId,

      source: inputPath,

      output: null,

      originalFile: outputName,

      status: "failed",

      originalTriangles: 0,

      finalTriangles: null,

      finalFileSizeBytes: null,

      pass1: summarizeSelection(null),

      pass2: summarizeSelection(null),

      pass3: emptyPass3(),

      durationSec: Math.round((Date.now() - started) / 1000),

      error: message,

    };

    await appendManifest(runDir, entry);

    return entry;

  } finally {

    if (workspaceId) {

      await rm(workspaceDir(dataDir, workspaceId), {

        recursive: true,

        force: true,

      }).catch(() => undefined);

    }

  }

}



async function listGlbFiles(inputDir: string): Promise<string[]> {

  const names = await readdir(inputDir);

  const files: string[] = [];

  for (const name of names) {

    const full = path.join(inputDir, name);

    const info = await stat(full);

    if (!info.isFile()) continue;

    if (path.extname(name).toLowerCase() === ".glb") {

      files.push(full);

    }

  }

  return files.sort((a, b) => a.localeCompare(b));

}



export interface BatchFolderResult {

  meta: BatchRunMeta;

  processed: number;

  ok: number;

  fallbackOriginal: number;

  failed: number;

  items: BatchManifestEntry[];

}



export interface BatchFolderProgress {

  current: number;

  total: number;

  currentFile: string | null;

  ok: number;

  fallbackOriginal: number;

  failed: number;

}



export interface BatchFolderOptions {

  onProgress?: (progress: BatchFolderProgress) => void;

}



export async function runBatchFolder(

  dataDir: string,

  inputDir: string,

  options?: BatchFolderOptions,

): Promise<BatchFolderResult> {

  const resolvedInput = path.resolve(inputDir);

  const inputStat = await stat(resolvedInput);

  if (!inputStat.isDirectory()) {

    throw new Error(`Input path is not a directory: ${resolvedInput}`);

  }



  const { runId, runDir } = await createRunOutputDir();

  const startedAt = new Date().toISOString();



  const meta: BatchRunMeta = {

    runId,

    runDir,

    inputDir: resolvedInput,

    startedAt,

    presetCount: ALL_PRESET_COUNT,

    texturePresetCount: TEXTURE_OPTIMIZATION_PRESET_COUNT,

    spriteThresholds: SPRITE_THRESHOLDS,

  };



  await writeFile(

    path.join(runDir, "batch.json"),

    JSON.stringify(meta, null, 2),

    "utf-8",

  );



  const glbFiles = await listGlbFiles(resolvedInput);

  let ok = 0;

  let fallbackOriginal = 0;

  let failed = 0;

  const items: BatchManifestEntry[] = [];



  const report = (currentFile: string | null, current: number) => {

    options?.onProgress?.({

      current,

      total: glbFiles.length,

      currentFile,

      ok,

      fallbackOriginal,

      failed,

    });

  };



  report(null, 0);



  try {

  for (let index = 0; index < glbFiles.length; index++) {

    const glbPath = glbFiles[index];

    report(path.basename(glbPath), index + 1);

    const result = await runSingleFilePipeline(dataDir, glbPath, runDir, runId);

    items.push(result);

    if (result.status === "ok") ok += 1;

    else if (result.status === "fallback_original") fallbackOriginal += 1;

    else failed += 1;

    report(path.basename(glbPath), index + 1);

  }



  report(null, glbFiles.length);



  return {

    meta,

    processed: glbFiles.length,

    ok,

    fallbackOriginal,

    failed,

    items,

  };

  } finally {

    await closeSpriteBrowser();

  }

}


