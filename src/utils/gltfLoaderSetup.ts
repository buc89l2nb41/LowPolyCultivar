import type { WebGLRenderer } from "three";
import { KTX2Loader, type GLTFLoader } from "three-stdlib";

/** Basis transcoder path (same CDN drei uses). */
export const KTX2_BASIS_PATH =
  "https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/";

let ktx2Loader: KTX2Loader | null = null;
let detectedRenderer: WebGLRenderer | null = null;

export function ensureKtx2Support(renderer: WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(KTX2_BASIS_PATH);
  }

  if (detectedRenderer !== renderer) {
    ktx2Loader.detectSupport(renderer);
    detectedRenderer = renderer;
  }

  return ktx2Loader;
}

export function extendGltfLoaderWithKtx2(loader: GLTFLoader): void {
  const ktx2 = ktx2Loader;
  if (ktx2) {
    loader.setKTX2Loader(ktx2);
  }
}

export function disposeKtx2Loader(): void {
  ktx2Loader?.dispose();
  ktx2Loader = null;
  detectedRenderer = null;
}
