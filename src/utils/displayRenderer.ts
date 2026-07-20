import * as THREE from "three";

export const DISPLAY_EXPOSURE = 1.28;
export const DISPLAY_BACKGROUND = "#1a2230";

export function configureDisplayRenderer(gl: THREE.WebGLRenderer): void {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = DISPLAY_EXPOSURE;
}
