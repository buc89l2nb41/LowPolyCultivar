import { compareSpritePair, closeSpriteBrowser } from "../server/spriteCompare.js";

const glbPath = process.argv[2] ?? "D:/Cursor/LowPolyCultivar/data/test-out.glb";

async function main(): Promise<void> {
  const result = await compareSpritePair(glbPath, glbPath);
  console.log(JSON.stringify(result, null, 2));
  await closeSpriteBrowser();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
