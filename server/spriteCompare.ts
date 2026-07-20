import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { resolveCultivarPath, workspaceDir } from "./workspace.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPARE_PAGE = path.join(__dirname, "sprite", "compare.html");
const SPRITE_ASSET_ORIGIN = "http://cultivar-sprite.local";

export interface SpriteCompareEntry {
  id: string;
  rank: number;
}

export interface SpriteCompareRequest {
  workspaceId: string;
  entries: SpriteCompareEntry[];
}

export interface SpriteEntryResult {
  id: string;
  rank: number;
  meanDiff: number;
  maxDiff: number;
  perAngle: number[];
}

export interface SpriteCompareResponse {
  cellSize: number;
  angleCount: number;
  entries: SpriteEntryResult[];
}

let browser: Browser | null = null;
let page: Page | null = null;

function toSpriteAssetUrl(filePath: string): string {
  const resolved = path.resolve(filePath);
  return `${SPRITE_ASSET_ORIGIN}/${encodeURIComponent(resolved)}`;
}

async function installAssetRouting(activePage: Page): Promise<void> {
  await activePage.route(`${SPRITE_ASSET_ORIGIN}/**`, async (route) => {
    try {
      const requestUrl = new URL(route.request().url());
      const filePath = decodeURIComponent(requestUrl.pathname.slice(1));
      const body = await readFile(filePath);
      await route.fulfill({
        status: 200,
        contentType: "model/gltf-binary",
        body,
      });
    } catch {
      await route.fulfill({ status: 404, body: "not found" });
    }
  });
}

async function acquirePage(): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await installAssetRouting(page);
    await page.goto(pathToFileURL(COMPARE_PAGE).href, { waitUntil: "load" });
    await page.waitForFunction(
      () => (window as Window & { __spriteReady?: boolean }).__spriteReady,
      { timeout: 120_000 },
    );
  }
  return page;
}

export async function closeSpriteBrowser(): Promise<void> {
  await page?.close().catch(() => undefined);
  page = null;
  await browser?.close().catch(() => undefined);
  browser = null;
}

export async function compareSpritePair(
  rootPath: string,
  candidatePath: string,
): Promise<Pick<SpriteEntryResult, "perAngle" | "maxDiff" | "meanDiff">> {
  const activePage = await acquirePage();
  return activePage.evaluate(
    async ({ root, candidate }) => {
      const fn = (window as Window & {
        __spriteComparePair?: (
          rootUrl: string,
          candidateUrl: string,
        ) => Promise<{
          perAngle: number[];
          maxDiff: number;
          meanDiff: number;
        }>;
      }).__spriteComparePair;
      if (!fn) throw new Error("sprite compare page not ready");
      return fn(root, candidate);
    },
    {
      root: toSpriteAssetUrl(rootPath),
      candidate: toSpriteAssetUrl(candidatePath),
    },
  );
}

export async function runSpriteCompare(
  dataDir: string,
  payload: SpriteCompareRequest,
): Promise<SpriteCompareResponse> {
  if (!payload.workspaceId) {
    throw new Error("workspaceId is required");
  }
  if (!Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw new Error("comparison entries are required");
  }

  const rootPath = path.join(
    workspaceDir(dataDir, payload.workspaceId),
    "root.glb",
  );

  const activePage = await acquirePage();
  const result = await activePage.evaluate(
    async ({ root, items }) => {
      const fn = (window as Window & {
        __spriteCompareBatch?: (
          rootUrl: string,
          batch: Array<{ id: string; url: string }>,
        ) => Promise<SpriteCompareResponse>;
      }).__spriteCompareBatch;
      if (!fn) throw new Error("sprite compare page not ready");
      return fn(root, items);
    },
    {
      root: toSpriteAssetUrl(rootPath),
      items: payload.entries.map((entry) => ({
        id: entry.id,
        url: toSpriteAssetUrl(resolveCultivarPath(dataDir, entry.id)),
      })),
    },
  );

  const rankById = new Map(payload.entries.map((entry) => [entry.id, entry.rank]));
  return {
    ...result,
    entries: result.entries.map((entry) => ({
      ...entry,
      rank: rankById.get(entry.id) ?? entry.rank ?? 0,
    })),
  };
}
