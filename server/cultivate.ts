import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  analyzeOutput,
  analyzeWithGltfpack,
  calcReductionPercent,
  runGltfpack,
} from "./gltfpack.js";
import {
  assessUvRisk,
  getAllPresets,
  paramsToArgs,
  paramsToCommand,
  paramsToLabel,
  formatPresetDisplayName,
} from "./presets.js";
import type {
  BatchResult,
  CultivarResult,
  CultivateResponse,
  VariantPreset,
} from "./types.js";
import {
  initWorkspace,
  loadMeta,
  makeCultivarId,
  nextBatchId,
  registerBatch,
  resolveCultivarPath,
  rootPreviewUrl,
  workspaceDir,
} from "./workspace.js";

async function generateCultivars(
  inputPath: string,
  outputDir: string,
  workspaceId: string,
  batchId: string,
  presets: VariantPreset[],
  rootTriangleCount: number,
  urlPrefix: string,
  sourceModel: string,
): Promise<CultivarResult[]> {
  await mkdir(outputDir, { recursive: true });
  const cultivars: CultivarResult[] = [];

  for (const preset of presets) {
    const outputName = `${preset.id}.glb`;
    const reportName = `${preset.id}.json`;
    const outputPath = path.join(outputDir, outputName);
    const reportPath = path.join(outputDir, reportName);
    const args = paramsToArgs(preset.params);

    await runGltfpack(inputPath, outputPath, args, reportPath);
    const stats = await analyzeOutput(outputPath, reportPath);
    await unlink(reportPath).catch(() => undefined);

    const id = makeCultivarId(workspaceId, batchId, preset.id);

    cultivars.push({
      id,
      batchId,
      name: formatPresetDisplayName(preset.params),
      description: preset.description,
      params: preset.params,
      paramsLabel: paramsToLabel(preset.params),
      paramsCommand: paramsToCommand(preset.params),
      presetGroupLabel: preset.groupLabel ?? "Custom",
      sourceModel,
      outputUrl: `${urlPrefix}/${outputName}`,
      stats,
      reductionPercent: calcReductionPercent(rootTriangleCount, stats.triangles),
      uvWarning: assessUvRisk(preset.params, stats.vertices, stats.triangles),
      isOriginal: false,
    });
  }

  return cultivars;
}

export async function cultivateNewWorkspace(
  dataDir: string,
  uploadPath: string,
  originalName: string,
): Promise<CultivateResponse> {
  const presets = getAllPresets();

  const { meta, rootStats } = await initWorkspace(
    dataDir,
    uploadPath,
    originalName,
  );
  const { batchId } = await nextBatchId(dataDir, meta.workspaceId);

  const batchDir = path.join(
    workspaceDir(dataDir, meta.workspaceId),
    "batches",
    batchId,
  );
  const rootPath = path.join(workspaceDir(dataDir, meta.workspaceId), "root.glb");
  const urlPrefix = `/files/${meta.workspaceId}/batches/${batchId}`;

  const cultivars = await generateCultivars(
    rootPath,
    batchDir,
    meta.workspaceId,
    batchId,
    presets,
    rootStats.triangles,
    urlPrefix,
    originalName,
  );

  const batchLabel = `All presets (${presets.length}) ← ${originalName}`;

  await registerBatch(dataDir, meta.workspaceId, {
    id: batchId,
    label: batchLabel,
    presetGroupId: "all",
    sourceCultivarId: null,
    sourceName: null,
  });

  const batch: BatchResult = {
    id: batchId,
    label: batchLabel,
    presetGroupId: "all",
    sourceCultivarId: null,
    sourceName: null,
    cultivars,
  };

  return {
    workspaceId: meta.workspaceId,
    rootOriginal: {
      name: originalName,
      stats: rootStats,
      previewUrl: rootPreviewUrl(meta.workspaceId),
    },
    batch,
  };
}

export async function cultivateFromCultivar(
  dataDir: string,
  workspaceId: string,
  sourceCultivarId: string,
  sourceName: string,
  presets: VariantPreset[],
  presetGroupId: string,
  batchLabel: string,
): Promise<CultivateResponse> {
  const sourcePath = resolveCultivarPath(dataDir, sourceCultivarId);
  await stat(sourcePath);

  const meta = await loadMeta(dataDir, workspaceId);
  const rootStats = meta.rootStats;

  const { batchId } = await nextBatchId(dataDir, workspaceId);
  const batchDir = path.join(
    workspaceDir(dataDir, workspaceId),
    "batches",
    batchId,
  );
  const urlPrefix = `/files/${workspaceId}/batches/${batchId}`;

  const cultivars = await generateCultivars(
    sourcePath,
    batchDir,
    workspaceId,
    batchId,
    presets,
    rootStats.triangles,
    urlPrefix,
    sourceName,
  );

  await registerBatch(dataDir, workspaceId, {
    id: batchId,
    label: batchLabel,
    presetGroupId,
    sourceCultivarId,
    sourceName,
  });

  return {
    workspaceId,
    rootOriginal: {
      name: meta.originalName,
      stats: rootStats,
      previewUrl: rootPreviewUrl(workspaceId),
    },
    batch: {
      id: batchId,
      label: batchLabel,
      presetGroupId,
      sourceCultivarId,
      sourceName,
      cultivars,
    },
  };
}

export async function recultivateFromSelection(
  dataDir: string,
  workspaceId: string,
  sourceCultivarId: string,
  sourceName: string,
): Promise<CultivateResponse> {
  const presets = getAllPresets();
  return cultivateFromCultivar(
    dataDir,
    workspaceId,
    sourceCultivarId,
    sourceName,
    presets,
    "all",
    `All presets (${presets.length}) ← ${sourceName}`,
  );
}

export async function recultivateWithPresets(
  dataDir: string,
  workspaceId: string,
  sourceCultivarId: string,
  sourceName: string,
  presets: VariantPreset[],
  presetGroupId: string,
): Promise<CultivateResponse> {
  const label =
    presetGroupId === "finetune"
      ? `Fine-tune ← ${sourceName}`
      : `Custom ← ${sourceName}`;

  return cultivateFromCultivar(
    dataDir,
    workspaceId,
    sourceCultivarId,
    sourceName,
    presets,
    presetGroupId,
    label,
  );
}
