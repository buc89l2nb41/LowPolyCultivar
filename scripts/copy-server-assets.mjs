import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await mkdir(path.join(projectRoot, "dist/server/sprite"), { recursive: true });
await copyFile(
  path.join(projectRoot, "server/sprite/compare.html"),
  path.join(projectRoot, "dist/server/sprite/compare.html"),
);
