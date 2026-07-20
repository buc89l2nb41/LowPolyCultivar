import { Canvas } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";

export type ModelRotation = [number, number];

interface SyncModelGizmoProps {
  rotation: ModelRotation;
  onRotationChange: (
    rotation: ModelRotation | ((prev: ModelRotation) => ModelRotation),
  ) => void;
}

function GizmoPreview({ rotation }: { rotation: ModelRotation }) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 4]} intensity={0.9} />
      <group rotation={[rotation[0], rotation[1], 0]}>
        <axesHelper args={[0.72]} />
        <mesh>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.85} />
        </mesh>
      </group>
    </>
  );
}

const DRAG_SENSITIVITY = 0.012;

export function SyncModelGizmo({
  rotation,
  onRotationChange,
}: SyncModelGizmoProps) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };

      onRotationChange((prev) => {
        const [rx, ry] = prev;
        const nextX = THREE.MathUtils.clamp(
          rx + dy * DRAG_SENSITIVITY,
          -Math.PI / 2.2,
          Math.PI / 2.2,
        );
        return [nextX, ry + dx * DRAG_SENSITIVITY];
      });
    },
    [onRotationChange],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onDoubleClick = useCallback(() => {
    onRotationChange([0, 0]);
  }, [onRotationChange]);

  return (
    <div
      className="sync-model-gizmo"
      role="application"
      aria-label="모델 로컬 회전 짐볼"
      title="드래그: 각 모델 로컬 회전 · 더블클릭: 초기화"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
    >
      <Canvas
        camera={{
          position: new THREE.Vector3(1.35, 1.15, 1.45),
          fov: 32,
          near: 0.1,
          far: 20,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <GizmoPreview rotation={rotation} />
      </Canvas>
      <span className="sync-model-gizmo-label">회전</span>
    </div>
  );
}
