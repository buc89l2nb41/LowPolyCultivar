import * as THREE from "three";
import { prepareDisplayMaterials } from "./displayMaterials";

const DEFAULT_TARGET_SIZE = 1.5;

/** glTF 씬을 중심 정렬·균일 스케일로 맞춤 (뷰어·캡처 공통) */
export function normalizeModelRoot(
  scene: THREE.Object3D,
  targetSize = DEFAULT_TARGET_SIZE,
): THREE.Group {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z, 0.001);
  clone.scale.setScalar(targetSize / max);
  const box2 = new THREE.Box3().setFromObject(clone);
  const center = box2.getCenter(new THREE.Vector3());
  clone.position.sub(center);
  const root = new THREE.Group();
  root.add(clone);
  prepareDisplayMaterials(root);
  return root;
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else {
        mat?.dispose();
      }
    }
  });
}
