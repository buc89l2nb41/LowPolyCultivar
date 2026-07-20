import {
  OrbitControls,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { clearPageGltf, preloadPageGltf, useConfiguredGLTF } from "../utils/gltfCache";
import { ensureKtx2Support } from "../utils/gltfLoaderSetup";
import { normalizeModelRoot } from "../utils/normalizeModel";
import { configureDisplayRenderer } from "../utils/displayRenderer";
import { OriginalReferencePanel } from "./OriginalReferencePanel";
import { DisplayLighting } from "./DisplayLighting";
import { PageModelStrip } from "./PageModelStrip";
import { SyncModelGizmo, type ModelRotation } from "./SyncModelGizmo";
import {
  colsForLayout,
  getViewUrl,
  type LayoutMode,
  type ViewEntry,
} from "./viewEntries";
import type { RootOriginal } from "../types";

const BASE_MODEL_SCALE = 1.5;
const MODEL_FOOTPRINT = 0.95;

function modelScaleForCount(count: number): number {
  if (count <= 4) return BASE_MODEL_SCALE;
  if (count <= 6) return 1.28;
  if (count <= 8) return 1.1;
  return 0.95;
}

function gridSpacing(layout: LayoutMode): { sx: number; sz: number } {
  if (layout === "grid-4") return { sx: 2.5, sz: 2.4 };
  if (layout === "grid-3") return { sx: 2.8, sz: 2.5 };
  if (layout === "grid-2") return { sx: 3.1, sz: 2.6 };
  return { sx: 2.8, sz: 0 };
}

export function gridPosition(
  index: number,
  count: number,
  cols: number,
  layout: LayoutMode,
): [number, number, number] {
  if (layout === "row") {
    const spacing = 2.7;
    const center = ((count - 1) * spacing) / 2;
    return [index * spacing - center, 0, 0];
  }
  const { sx, sz } = gridSpacing(layout);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rows = Math.ceil(count / cols);
  const cx = ((cols - 1) * sx) / 2;
  const cz = ((rows - 1) * sz) / 2;
  return [col * sx - cx, 0, row * sz - cz];
}

function gridBounds(
  count: number,
  cols: number,
  layout: LayoutMode,
  footprint: number,
) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const [x, , z] = gridPosition(i, count, cols, layout);
    minX = Math.min(minX, x - footprint);
    maxX = Math.max(maxX, x + footprint);
    minZ = Math.min(minZ, z - footprint);
    maxZ = Math.max(maxZ, z + footprint);
  }

  const width = maxX - minX;
  const depth = Math.max(maxZ - minZ, footprint * 2);
  return { width, depth, minY: 0, maxY: footprint * 1.8 };
}

function ScaledModel({
  url,
  scale,
}: {
  url: string;
  scale: number;
}) {
  const { scene } = useConfiguredGLTF(url);

  const normalized = useMemo(
    () => normalizeModelRoot(scene, scale),
    [scene, scale],
  );

  return <primitive object={normalized} />;
}

class ModelLoadErrorBoundary extends Component<
  { children: ReactNode; url: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { url: string }) {
    if (prev.url !== this.props.url) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="#ef4444" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

function PageCell({
  entry,
  index,
  count,
  cols,
  layout,
  modelScale,
  active,
  rotation,
  onSelect,
}: {
  entry: ViewEntry;
  index: number;
  count: number;
  cols: number;
  layout: LayoutMode;
  modelScale: number;
  active: boolean;
  rotation: ModelRotation;
  onSelect: (id: string) => void;
}) {
  const position = gridPosition(index, count, cols, layout);
  const url = getViewUrl(entry);
  const isOriginal = entry.kind === "original";
  const footprint = MODEL_FOOTPRINT * (modelScale / BASE_MODEL_SCALE);
  const hitSize = footprint * 1.65;

  return (
    <group position={position}>
      <group rotation={[rotation[0], rotation[1], 0]}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(entry.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
          }}
        >
          <boxGeometry args={[hitSize, hitSize, hitSize]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <ModelLoadErrorBoundary url={url}>
          <Suspense fallback={null}>
            <ScaledModel url={url} scale={modelScale} />
          </Suspense>
        </ModelLoadErrorBoundary>
      </group>
      {active && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[footprint * 0.72, footprint * 0.88, 32]} />
          <meshBasicMaterial
            color={isOriginal ? "#22c55e" : "#3b82f6"}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}
    </group>
  );
}

function FitPageCamera({
  count,
  cols,
  layout,
  modelScale,
  controlsRef,
}: {
  count: number;
  cols: number;
  layout: LayoutMode;
  modelScale: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();
  const footprint = MODEL_FOOTPRINT * (modelScale / BASE_MODEL_SCALE);

  useLayoutEffect(() => {
    const { width, depth, maxY } = gridBounds(count, cols, layout, footprint);
    const aspect = size.width / Math.max(size.height, 1);
    const cam = camera as THREE.PerspectiveCamera;

    const fitHeight = maxY * 2.2;
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const distForHeight = fitHeight / (2 * Math.tan(vFov / 2));
    const distForWidth = width / (2 * Math.tan(hFov / 2));
    const distForDepth = depth / (2 * Math.tan(hFov / 2));
    const dist = Math.max(distForHeight, distForWidth, distForDepth) * 1.22;

    cam.position.set(0, dist * 0.38, dist);
    cam.lookAt(0, maxY * 0.35, 0);
    cam.near = 0.1;
    cam.far = dist * 4;
    cam.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, maxY * 0.35, 0);
      controlsRef.current.minDistance = dist * 0.55;
      controlsRef.current.maxDistance = dist * 1.85;
      controlsRef.current.update();
    }
  }, [count, cols, layout, footprint, camera, size, controlsRef]);

  return null;
}

function PageScene({
  pageEntries,
  pageUrls,
  cols,
  layout,
  selectedId,
  rotation,
  onSelect,
}: {
  pageEntries: ViewEntry[];
  pageUrls: string[];
  cols: number;
  layout: LayoutMode;
  selectedId: string | null;
  rotation: ModelRotation;
  onSelect: (id: string) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const count = pageEntries.length;
  const modelScale = modelScaleForCount(count);

  useEffect(() => {
    const urls = pageUrls;
    preloadPageGltf(urls);
    return () => {
      clearPageGltf(urls);
    };
  }, [pageUrls]);

  return (
    <>
      <DisplayLighting />
      <FitPageCamera
        count={count}
        cols={cols}
        layout={layout}
        modelScale={modelScale}
        controlsRef={controlsRef}
      />
      <group>
        {pageEntries.map((entry, index) => (
          <PageCell
            key={entry.id}
            entry={entry}
            index={index}
            count={count}
            cols={cols}
            layout={layout}
            modelScale={modelScale}
            active={entry.id === selectedId}
            rotation={rotation}
            onSelect={onSelect}
          />
        ))}
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate={false}
        enablePan={false}
        enableZoom
        target={[0, 0.35, 0]}
      />
    </>
  );
}

interface MultiModelGridProps {
  entries: ViewEntry[];
  rootOriginal: RootOriginal | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  pageIndex: number;
  onPageChange: (page: number) => void;
  perPage: number;
  layout: LayoutMode;
  suspended?: boolean;
}

export function MultiModelGrid({
  entries,
  rootOriginal,
  selectedId,
  onSelect,
  pageIndex,
  onPageChange,
  perPage,
  layout,
  suspended = false,
}: MultiModelGridProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState<ModelRotation>([0, 0]);
  const [contextLost, setContextLost] = useState(false);
  const cols = colsForLayout(layout, perPage);

  const pageCount = Math.max(1, Math.ceil(entries.length / perPage));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePage * perPage;
  const pageEntries = useMemo(
    () => entries.slice(pageStart, pageStart + perPage),
    [entries, pageStart, perPage],
  );
  const pageUrls = useMemo(
    () => pageEntries.map(getViewUrl),
    [pageEntries],
  );

  useEffect(() => {
    setRotation([0, 0]);
  }, [safePage, layout, perPage]);

  const goPage = useCallback(
    (delta: number) => {
      onPageChange(Math.min(pageCount - 1, Math.max(0, safePage + delta)));
    },
    [onPageChange, pageCount, safePage],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "SELECT" ||
          t.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPage(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goPage(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPage]);

  useEffect(() => {
    if (!suspended) {
      setContextLost(false);
    }
  }, [suspended]);

  const showViewer = !suspended && pageEntries.length > 0;

  if (entries.length === 0 && !rootOriginal) return null;

  return (
    <div className="multi-model-grid-wrap">
      <div className="row-viewer-nav">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={safePage <= 0}
          onClick={() => goPage(-1)}
        >
          ← 이전 페이지
        </button>
        <span className="viewer-nav-label">
          페이지 {safePage + 1} / {pageCount}
          {pageEntries.length > 0 && (
            <span className="viewer-nav-sub">
              {" "}
              (#{pageStart + 1}–#{pageStart + pageEntries.length})
            </span>
          )}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={safePage >= pageCount - 1}
          onClick={() => goPage(1)}
        >
          다음 페이지 →
        </button>
      </div>
      <div
        className="multi-model-canvas row-canvas page-canvas"
        ref={viewerRef}
        tabIndex={0}
        role="application"
        aria-label="품종 3D 비교 뷰"
      >
        {rootOriginal && (
          <OriginalReferencePanel
            original={rootOriginal}
            rotation={rotation}
            active={selectedId === "original"}
            onSelect={() => onSelect("original")}
            suspended={suspended}
          />
        )}
        <SyncModelGizmo rotation={rotation} onRotationChange={setRotation} />
        {showViewer && (
        <Canvas
          camera={{ fov: 42, near: 0.1, far: 300 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            configureDisplayRenderer(gl);
            ensureKtx2Support(gl);
            const canvas = gl.domElement;
            const onLost = (event: Event) => {
              event.preventDefault();
              setContextLost(true);
            };
            const onRestored = () => setContextLost(false);
            canvas.addEventListener("webglcontextlost", onLost, false);
            canvas.addEventListener("webglcontextrestored", onRestored, false);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#1a2230"]} />
          <PageScene
            key={`${safePage}-${layout}-${perPage}`}
            pageEntries={pageEntries}
            pageUrls={pageUrls}
            cols={cols}
            layout={layout}
            selectedId={selectedId}
            rotation={rotation}
            onSelect={onSelect}
          />
        </Canvas>
        )}
        {(suspended || contextLost) && (
          <div
            className={`viewer-loading-overlay ${contextLost ? "viewer-context-lost" : ""}`}
          >
            {suspended
              ? "스프라이트 비교 중 GPU 사용 — 3D 뷰어 일시 중지 (완료 후 자동 복구)"
              : "WebGL 컨텍스트가 끊겼습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요."}
          </div>
        )}
      </div>
      {pageEntries.length > 0 && (
      <PageModelStrip
        pageEntries={pageEntries}
        pageStart={pageStart}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      )}
    </div>
  );
}

export type { ViewEntry };
