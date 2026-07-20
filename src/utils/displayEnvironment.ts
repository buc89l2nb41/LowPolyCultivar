import * as THREE from "three";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three-stdlib";

let studioEnvironment: THREE.Texture | null = null;
let pmremGenerator: PMREMGenerator | null = null;

/** model-viewer 스타일 실내 스튜디오 IBL — 태양광이 아니라 벽면 반사로 고르게 밝음 */
export function getStudioEnvironment(
  renderer: THREE.WebGLRenderer,
): THREE.Texture {
  if (!studioEnvironment) {
    pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const room = new RoomEnvironment();
    studioEnvironment = pmremGenerator.fromScene(room, 0.04).texture;
  }
  return studioEnvironment;
}

export function applyStudioEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): void {
  scene.environment = getStudioEnvironment(renderer);
}

export function disposeStudioEnvironment(): void {
  studioEnvironment?.dispose();
  studioEnvironment = null;
  pmremGenerator?.dispose();
  pmremGenerator = null;
}
