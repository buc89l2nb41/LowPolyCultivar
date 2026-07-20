import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  cultivateNewWorkspace,
  recultivateFromSelection,
  recultivateWithPresets,
} from "./cultivate.js";
import { generateExactPreset, generateFineTunePresets } from "./finetune.js";
import { getGltfpackPath } from "./gltfpack.js";
import { ALL_PRESET_COUNT, TEXTURE_PRESET_COUNT } from "./presets.js";
import { SPRITE_THRESHOLDS } from "./spriteStatus.js";
import type { GltfpackParams } from "./types.js";
import { OUTPUT_BASE_DIR } from "./batchPaths.js";
import { getBatchJob, startBatchJob } from "./batchJobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const PORT = Number(process.env.PORT ?? 3001);

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await mkdir(DATA_DIR, { recursive: true });
      cb(null, DATA_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `upload-${randomUUID()}${ext || ".glb"}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".glb", ".gltf", ".obj"].includes(ext)) cb(null, true);
    else cb(new Error("Only .glb, .gltf, .obj files are supported"));
  },
});

const batchUpload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      const stagingId = (_req as express.Request & { batchStagingId?: string })
        .batchStagingId;
      if (!stagingId) {
        cb(new Error("batch staging id missing"), "");
        return;
      }
      const dest = path.join(DATA_DIR, stagingId);
      await mkdir(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const base = path.basename(file.originalname.replace(/\\/g, "/"));
      cb(null, base);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 500 },
  fileFilter: (_req, file, cb) => {
    const base = path.basename(file.originalname.replace(/\\/g, "/"));
    if (base.toLowerCase().endsWith(".glb")) cb(null, true);
    else cb(null, false);
  },
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    gltfpack: getGltfpackPath(),
    presetCount: ALL_PRESET_COUNT,
    texturePresetCount: TEXTURE_PRESET_COUNT,
    spriteCompare: {
      mode: "playwright",
      thresholds: SPRITE_THRESHOLDS,
    },
  });
});

app.post("/api/cultivate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const response = await cultivateNewWorkspace(
      DATA_DIR,
      req.file.path,
      req.file.originalname,
    );

    await rm(req.file.path, { force: true }).catch(() => undefined);

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/recultivate", async (req, res) => {
  try {
    const { workspaceId, cultivarId, cultivarName } = req.body as {
      workspaceId?: string;
      cultivarId?: string;
      cultivarName?: string;
    };

    if (!workspaceId || !cultivarId || !cultivarName) {
      res.status(400).json({
        error: "workspaceId, cultivarId, cultivarName are required",
      });
      return;
    }

    const response = await recultivateFromSelection(
      DATA_DIR,
      workspaceId,
      cultivarId,
      cultivarName,
    );

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/finetune", async (req, res) => {
  try {
    const { workspaceId, cultivarId, cultivarName, baseParams, mode } = req.body as {
      workspaceId?: string;
      cultivarId?: string;
      cultivarName?: string;
      baseParams?: GltfpackParams;
      mode?: "variants" | "exact";
    };

    if (!workspaceId || !cultivarId || !cultivarName || !baseParams) {
      res.status(400).json({
        error: "workspaceId, cultivarId, cultivarName, baseParams are required",
      });
      return;
    }

    const presets =
      mode === "exact"
        ? generateExactPreset(baseParams, cultivarName)
        : generateFineTunePresets(baseParams, cultivarName);

    const response = await recultivateWithPresets(
      DATA_DIR,
      workspaceId,
      cultivarId,
      cultivarName,
      presets,
      "finetune",
    );

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/batch/start", async (req, res) => {
  try {
    const { inputDir } = req.body as { inputDir?: string };
    if (!inputDir?.trim()) {
      res.status(400).json({ error: "inputDir is required" });
      return;
    }
    const resolved = path.resolve(inputDir.trim());
    const jobId = startBatchJob(DATA_DIR, resolved);
    res.json({ jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post(
  "/api/batch/upload",
  (req, res, next) => {
    const stagingId = `batch-in-${randomUUID()}`;
    (req as express.Request & { batchStagingId?: string }).batchStagingId =
      stagingId;
    next();
  },
  batchUpload.array("files", 500),
  async (req, res) => {
    try {
      const stagingId = (req as express.Request & { batchStagingId?: string })
        .batchStagingId;
      const files = req.files as Express.Multer.File[] | undefined;
      if (!stagingId || !files?.length) {
        res.status(400).json({ error: "No .glb files uploaded" });
        return;
      }
      const stagingDir = path.join(DATA_DIR, stagingId);
      const jobId = startBatchJob(DATA_DIR, stagingDir, [stagingDir]);
      res.json({ jobId, fileCount: files.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

app.get("/api/batch/jobs/:jobId", (req, res) => {
  const job = getBatchJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

app.use("/files", express.static(DATA_DIR));
app.use("/output", express.static(OUTPUT_BASE_DIR));

app.delete("/api/workspaces/:workspaceId", async (req, res) => {
  try {
    const workspaceDir = path.join(DATA_DIR, req.params.workspaceId);
    await rm(workspaceDir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});

app.listen(PORT, () => {
  console.log(`LowPoly Cultivar server on http://localhost:${PORT}`);
  console.log(`gltfpack: ${getGltfpackPath()}`);
  console.log(`sprite compare: auto-select < ${SPRITE_THRESHOLDS.caution} (유사·주의)`);
  console.log(`presets: ${ALL_PRESET_COUNT} variants per generation`);
});
