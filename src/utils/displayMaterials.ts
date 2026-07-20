import * as THREE from "three";

const STUDIO_ENV_MAP_INTENSITY = 1.4;

export function prepareDisplayMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        material.envMapIntensity = STUDIO_ENV_MAP_INTENSITY;
        material.needsUpdate = true;
      }
    }
  });
}

export { STUDIO_ENV_MAP_INTENSITY };
