import { useGLTF } from "@react-three/drei";
import { extendGltfLoaderWithKtx2 } from "./gltfLoaderSetup";

export function useConfiguredGLTF(url: string) {
  return useGLTF(url, true, true, extendGltfLoaderWithKtx2);
}

export function preloadPageGltf(urls: readonly string[]): void {
  for (const url of urls) {
    useGLTF.preload(url, true, true, extendGltfLoaderWithKtx2);
  }
}

export function clearPageGltf(urls: readonly string[]): void {
  for (const url of urls) {
    useGLTF.clear(url);
  }
}
