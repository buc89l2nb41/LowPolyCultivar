#!/usr/bin/env node
/**
 * LowPoly Cultivar one-shot setup after git clone / pull.
 *
 * Usage:
 *   npm run setup
 *   npm run setup -- --minimal     # skip Playwright Chromium
 *   npm run setup -- --skip-npm    # skip npm install (already done)
 */

import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const GLTFPACK_RELEASE = "v1.0";
const MIN_NODE_MAJOR = 20;

const args = process.argv.slice(2);
const minimal = args.includes("--minimal");
const skipNpm = args.includes("--skip-npm");

function log(step, message) {
  console.log(`[setup] ${step}: ${message}`);
}

function fail(message) {
  console.error(`[setup] ERROR: ${message}`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`));
    });
  });
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR) {
    fail(
      `Node.js ${MIN_NODE_MAJOR}+ is required (current: ${process.versions.node}). Install from https://nodejs.org/`,
    );
  }
  log("node", `v${process.versions.node}`);
}

function gltfpackAssetName() {
  if (process.platform === "win32") return "gltfpack-windows.zip";
  if (process.platform === "darwin") {
    return process.arch === "arm64"
      ? "gltfpack-macos.zip"
      : "gltfpack-macos-intel.zip";
  }
  return "gltfpack-ubuntu.zip";
}

function gltfpackExePath() {
  const exeName = process.platform === "win32" ? "gltfpack.exe" : "gltfpack";
  return path.join(projectRoot, "tools", "gltfpack", exeName);
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed (${response.status}): ${url}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

async function extractZip(zipPath, destinationDir) {
  mkdirSync(destinationDir, { recursive: true });

  if (process.platform === "win32") {
    await run(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`,
      ],
      { shell: false },
    );
    return;
  }

  if (commandExists("unzip")) {
    await run("unzip", ["-o", zipPath, "-d", destinationDir], { shell: false });
    return;
  }

  fail("unzip command not found. Install unzip or run setup on Windows.");
}

function commandExists(name) {
  const which = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(which, [name], { stdio: "ignore" });
  return result.status === 0;
}

function findBinaryInDir(dir, exeName) {
  if (!existsSync(dir)) return null;
  const direct = path.join(dir, exeName);
  if (existsSync(direct)) return direct;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === exeName) return full;
    if (entry.isDirectory()) {
      const nested = findBinaryInDir(full, exeName);
      if (nested) return nested;
    }
  }
  return null;
}

async function installGltfpack() {
  const exeName = process.platform === "win32" ? "gltfpack.exe" : "gltfpack";
  const targetDir = path.join(projectRoot, "tools", "gltfpack");
  const targetExe = path.join(targetDir, exeName);

  if (existsSync(targetExe)) {
    log("gltfpack", `already installed at ${targetExe}`);
    return targetExe;
  }

  if (process.env.GLTFPACK_PATH && existsSync(process.env.GLTFPACK_PATH)) {
    log("gltfpack", `using GLTFPACK_PATH=${process.env.GLTFPACK_PATH}`);
    return process.env.GLTFPACK_PATH;
  }

  const asset = gltfpackAssetName();
  const url = `https://github.com/zeux/meshoptimizer/releases/download/${GLTFPACK_RELEASE}/${asset}`;
  const zipPath = path.join(projectRoot, "tools", asset);
  const extractDir = path.join(projectRoot, "tools", "_gltfpack_extract");

  mkdirSync(path.join(projectRoot, "tools"), { recursive: true });
  log("gltfpack", `downloading ${asset} (${GLTFPACK_RELEASE})`);
  await downloadFile(url, zipPath);

  rmSync(extractDir, { recursive: true, force: true });
  log("gltfpack", "extracting…");
  await extractZip(zipPath, extractDir);

  const found = findBinaryInDir(extractDir, exeName);
  if (!found) {
    fail(`gltfpack binary not found inside ${asset}`);
  }

  mkdirSync(targetDir, { recursive: true });
  const { copyFileSync } = await import("node:fs");
  copyFileSync(found, targetExe);
  if (process.platform !== "win32") {
    await chmod(targetExe, 0o755);
  }

  rmSync(extractDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });

  log("gltfpack", `installed to ${targetExe}`);
  return targetExe;
}

async function verifyGltfpack(gltfpackPath) {
  return new Promise((resolve) => {
    const child = spawn(gltfpackPath, ["-h"], {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => {
      resolve(code === 0 || /gltfpack/i.test(stderr));
    });
  });
}

async function installPlaywright() {
  log("playwright", "installing Chromium (여러 모델 자동 처리용)…");
  await run("npx", ["playwright", "install", "chromium"], { shell: true });
  log("playwright", "Chromium ready");
}

async function main() {
  console.log("LowPoly Cultivar setup\n");

  checkNodeVersion();

  if (!skipNpm) {
    log("npm", "installing dependencies…");
    await run("npm", ["install"], { shell: true });
  } else {
    log("npm", "skipped (--skip-npm)");
  }

  const gltfpackPath = await installGltfpack();
  const gltfpackOk = await verifyGltfpack(gltfpackPath);
  if (!gltfpackOk) {
    fail(`gltfpack could not be executed: ${gltfpackPath}`);
  }
  log("gltfpack", "verified");

  if (minimal) {
    log("playwright", "skipped (--minimal)");
  } else {
    await installPlaywright();
  }

  console.log("\n[setup] Done.\n");
  console.log("Next:");
  console.log("  npm run dev          # 개발 서버 (http://localhost:5173)");
  if (minimal) {
    console.log("  npx playwright install chromium   # 여러 모델 자동 처리용");
  } else {
    console.log("  npm run batch -- --in <folder>   # 여러 GLB 자동 처리 CLI");
  }
  console.log(`\n  gltfpack: ${gltfpackPath}`);
  if (!process.env.GLTFPACK_PATH) {
    console.log("  (자동 설치 경로 사용. 다른 경로를 쓰려면 GLTFPACK_PATH 설정)");
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
