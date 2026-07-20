import { spawn } from "node:child_process";
import { readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { MeshStats } from "./types.js";

const GLTFPACK_PATH = process.env.GLTFPACK_PATH ?? "d:\\gltfpack\\gltfpack.exe";

interface GltfpackReport {
  scene: {
    nodeCount: number;
    meshCount: number;
    materialCount: number;
    textureCount: number;
    animationCount: number;
  };
  render: {
    drawCount: number;
    instanceCount: number;
    triangleCount: number;
  };
  data: {
    json: number;
    binary: number;
    buffers: {
      vertex: number;
      index: number;
      animation: number;
      transform: number;
      image: number;
    };
  };
}

export async function runGltfpack(
  inputPath: string,
  outputPath: string,
  extraArgs: string[],
  reportPath?: string,
): Promise<void> {
  const args = ["-i", inputPath, "-o", outputPath, ...extraArgs];
  if (reportPath) args.push("-r", reportPath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(GLTFPACK_PATH, args, { windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gltfpack failed (code ${code}): ${stderr.trim()}`));
    });
  });
}

function estimateVertices(report: GltfpackReport): number {
  const vertexBytes = report.data.buffers.vertex;
  if (vertexBytes > 0) {
    return Math.round(vertexBytes / 12);
  }
  return report.render.triangleCount * 2;
}

async function readReport(reportPath: string): Promise<GltfpackReport> {
  const raw = await readFile(reportPath, "utf-8");
  return JSON.parse(raw) as GltfpackReport;
}

function buildMeshStats(
  report: GltfpackReport,
  fileSizeBytes: number,
): MeshStats {
  const vertices = estimateVertices(report);
  const triangles = report.render.triangleCount;

  return {
    vertices,
    triangles,
    meshes: report.scene.meshCount,
    materials: report.scene.materialCount,
    textures: report.scene.textureCount,
    animations: report.scene.animationCount,
    fileSizeBytes,
    drawCallsEstimate: report.render.drawCount,
    textureBytes: report.data.buffers.image,
    vertexTriangleDelta: Math.abs(vertices - triangles),
    vertexTriangleRatio:
      triangles > 0 ? Math.round((vertices / triangles) * 1000) / 1000 : 0,
  };
}

export async function analyzeWithGltfpack(
  inputPath: string,
  workDir: string,
  label: string,
): Promise<MeshStats> {
  const outputPath = path.join(workDir, `${label}-analyze.glb`);
  const reportPath = path.join(workDir, `${label}-report.json`);

  await runGltfpack(inputPath, outputPath, ["-si", "1"], reportPath);

  const [fileStat, report] = await Promise.all([
    stat(outputPath),
    readReport(reportPath),
  ]);

  await Promise.all([
    unlink(outputPath).catch(() => undefined),
    unlink(reportPath).catch(() => undefined),
  ]);

  return buildMeshStats(report, fileStat.size);
}

export async function analyzeOutput(
  outputPath: string,
  reportPath: string,
): Promise<MeshStats> {
  const [fileStat, report] = await Promise.all([
    stat(outputPath),
    readReport(reportPath),
  ]);

  return buildMeshStats(report, fileStat.size);
}

export function calcReductionPercent(
  originalTriangles: number,
  optimizedTriangles: number,
): number {
  if (originalTriangles <= 0) return 0;
  return Math.round((1 - optimizedTriangles / originalTriangles) * 100);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getGltfpackPath(): string {
  return path.normalize(GLTFPACK_PATH);
}
