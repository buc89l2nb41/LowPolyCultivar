import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import type { RootOriginal } from "../types";
import { formatNumber } from "../utils";
import { useConfiguredGLTF } from "../utils/gltfCache";
import { ensureKtx2Support } from "../utils/gltfLoaderSetup";import { normalizeModelRoot } from "../utils/normalizeModel";
import { configureDisplayRenderer } from "../utils/displayRenderer";
import { DisplayLighting } from "./DisplayLighting";
import type { ModelRotation } from "./SyncModelGizmo";

const PREVIEW_SCALE = 1.35;

function PreviewModel({ url, rotation }: { url: string; rotation: ModelRotation }) {
  const { scene } = useConfiguredGLTF(url);
  const normalized = useMemo(
    () => normalizeModelRoot(scene, PREVIEW_SCALE),
    [scene],
  );

  return (
    <group rotation={[rotation[0], rotation[1], 0]}>
      <primitive object={normalized} />
    </group>
  );
}

interface OriginalReferencePanelProps {
  original: RootOriginal;
  rotation: ModelRotation;
  active: boolean;
  onSelect: () => void;
  suspended?: boolean;
}

export function OriginalReferencePanel({
  original,
  rotation,
  active,
  onSelect,
  suspended = false,
}: OriginalReferencePanelProps) {
  return (
    <button
      type="button"
      className={`original-reference-panel ${active ? "active" : ""}`}
      onClick={onSelect}
      title={`원본: ${original.name}`}
      aria-label="원본 모델 선택"
      aria-pressed={active}
    >
      {suspended ? (
        <div className="original-reference-suspended" aria-hidden>
          원본
        </div>
      ) : (
      <Canvas
        camera={{
          position: new THREE.Vector3(1.35, 1.15, 1.45),
          fov: 32,
          near: 0.1,
          far: 20,
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0, 0);
          configureDisplayRenderer(gl);
          ensureKtx2Support(gl);
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <DisplayLighting />
        <Suspense fallback={null}>
          <PreviewModel url={original.previewUrl} rotation={rotation} />
        </Suspense>
      </Canvas>
      )}
      <span className="original-reference-label">원본</span>
      <span className="original-reference-stats">
        {formatNumber(original.stats.triangles)} tris
      </span>
    </button>
  );
}
