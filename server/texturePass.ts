import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { runGltfpack } from "./gltfpack.js";
import {
  getTextureOptimizationPresets,
  paramsToArgs,
} from "./presets.js";
import { compareSpritePair } from "./spriteCompare.js";
import { getAbsoluteSpriteVerdict, isAutoSelectVerdict } from "./spriteStatus.js";

export interface TextureCandidate {
  presetId: string;
  fileSizeBytes: number;
  maxDiff: number | null;
  meanDiff: number | null;
}

export interface TexturePassResult {
  outputPath: string;
  selectedPresetId: string;
  fileSizeBytes: number;
  candidates: TextureCandidate[];
}

interface ScoredCandidate extends TextureCandidate {
  outputPath: string;
}

export async function runTexturePassPickSmallest(
  sourcePath: string,
  workDir: string,
): Promise<TexturePassResult> {
  await mkdir(workDir, { recursive: true });
  const presets = getTextureOptimizationPresets();
  const scored: ScoredCandidate[] = [];

  const sourceStat = await stat(sourcePath);
  scored.push({
    presetId: "source",
    fileSizeBytes: sourceStat.size,
    maxDiff: 0,
    meanDiff: 0,
    outputPath: sourcePath,
  });

  for (const preset of presets) {
    const safeId = preset.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const outputPath = path.join(workDir, `${safeId}.glb`);
    const reportPath = path.join(workDir, `${safeId}.json`);

    await runGltfpack(
      sourcePath,
      outputPath,
      paramsToArgs(preset.params),
      reportPath,
    );

    const fileStat = await stat(outputPath);
    const sprite = await compareSpritePair(sourcePath, outputPath);
    scored.push({
      presetId: preset.id,
      fileSizeBytes: fileStat.size,
      maxDiff: sprite.maxDiff,
      meanDiff: sprite.meanDiff,
      outputPath,
    });

    await unlink(reportPath).catch(() => undefined);
  }

  const acceptable = scored.filter((item) =>
    isAutoSelectVerdict(getAbsoluteSpriteVerdict(item.maxDiff ?? 1)),
  );
  const pool =
    acceptable.length > 0
      ? acceptable
      : scored.filter((item) => item.presetId === "source");

  const best = pool.reduce((left, right) =>
    right.fileSizeBytes < left.fileSizeBytes ? right : left,
  );

  const candidates: TextureCandidate[] = scored.map(
    ({ outputPath: _outputPath, ...rest }) => rest,
  );

  return {
    outputPath: best.outputPath,
    selectedPresetId: best.presetId,
    fileSizeBytes: best.fileSizeBytes,
    candidates,
  };
}
