import * as THREE from "three";
import { GLTFLoader, KTX2Loader, MeshoptDecoder } from "three-stdlib";
import { disposeObject3D, normalizeModelRoot } from "./normalizeModel";
import { KTX2_BASIS_PATH } from "./gltfLoaderSetup";
import {
  applyStudioEnvironment,
  disposeStudioEnvironment,
} from "./displayEnvironment";
import { configureDisplayRenderer } from "./displayRenderer";

export const CAPTURE_ANGLES = [0, 90, 180, 270] as const;
export type CaptureAngle = (typeof CAPTURE_ANGLES)[number];

export interface CameraFrame {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  near: number;
  far: number;
  fov: number;
}

export interface AngleCaptureFrame {
  yawDeg: CaptureAngle;
  camera: CameraFrame;
}

let loader: GLTFLoader | null = null;
let captureKtx2Loader: KTX2Loader | null = null;

async function getLoader(renderer: THREE.WebGLRenderer): Promise<GLTFLoader> {
  if (!loader) {
    const decoder = MeshoptDecoder();
    await decoder.ready;
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(decoder);
  }

  if (!captureKtx2Loader) {
    captureKtx2Loader = new KTX2Loader();
    captureKtx2Loader.setTranscoderPath(KTX2_BASIS_PATH);
  }
  captureKtx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(captureKtx2Loader);

  return loader;
}

function saveCameraFrame(camera: THREE.PerspectiveCamera): CameraFrame {
  return {
    position: camera.position.toArray() as [number, number, number],
    quaternion: camera.quaternion.toArray() as [number, number, number, number],
    near: camera.near,
    far: camera.far,
    fov: camera.fov,
  };
}

function applyCameraFrame(
  camera: THREE.PerspectiveCamera,
  frame: CameraFrame,
): void {
  camera.position.fromArray(frame.position);
  camera.quaternion.fromArray(frame.quaternion);
  camera.near = frame.near;
  camera.far = frame.far;
  camera.fov = frame.fov;
  camera.updateProjectionMatrix();
}

function fitCameraToModel(
  camera: THREE.PerspectiveCamera,
  model: THREE.Object3D,
  padding = 1.28,
): void {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const dist = (maxDim / 2 / Math.tan(vFov / 2)) * padding;

  camera.position.set(
    center.x + dist * 0.42,
    center.y + dist * 0.34,
    center.z + dist,
  );
  camera.lookAt(center);
  camera.near = dist / 100;
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
}

export interface CapturedViews {
  images: string[];
  cellSize: number;
  frames?: AngleCaptureFrame[];
}

let sharedRenderer: THREE.WebGLRenderer | null = null;

function getRenderer(cellSize: number): THREE.WebGLRenderer {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setClearColor(0x1a2230, 1);
    configureDisplayRenderer(sharedRenderer);
  }
  sharedRenderer.setSize(cellSize, cellSize, false);
  return sharedRenderer;
}

export function disposeCaptureRenderer(): void {
  sharedRenderer?.dispose();
  sharedRenderer = null;
  disposeStudioEnvironment();
}

async function renderModelCaptures(
  url: string,
  cellSize: number,
  referenceFrames?: AngleCaptureFrame[],
): Promise<CapturedViews> {
  const renderer = getRenderer(cellSize);
  const gltfLoader = await getLoader(renderer);
  const gltf = await gltfLoader.loadAsync(url);
  const model = normalizeModelRoot(gltf.scene);
  const scene = new THREE.Scene();
  scene.add(model);
  applyStudioEnvironment(scene, renderer);
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
  const images: string[] = [];
  const frames: AngleCaptureFrame[] = [];

  try {
    for (let index = 0; index < CAPTURE_ANGLES.length; index++) {
      const yawDeg = CAPTURE_ANGLES[index];
      model.rotation.set(0, THREE.MathUtils.degToRad(yawDeg), 0);

      if (referenceFrames) {
        applyCameraFrame(camera, referenceFrames[index].camera);
      } else {
        fitCameraToModel(camera, model);
        frames.push({ yawDeg, camera: saveCameraFrame(camera) });
      }

      renderer.render(scene, camera);
      images.push(renderer.domElement.toDataURL("image/png"));
    }
  } finally {
    scene.remove(model);
    disposeObject3D(model);
  }

  return {
    images,
    cellSize,
    frames: referenceFrames ?? frames,
  };
}

/** 원본 기준으로 각도별 카메라를 저장 (4각도 스프라이트 비교용) */
export async function captureReferenceViews(
  url: string,
  cellSize: number,
): Promise<CapturedViews & { frames: AngleCaptureFrame[] }> {
  const result = await renderModelCaptures(url, cellSize);
  return {
    ...result,
    frames: result.frames ?? [],
  };
}

/** 원본과 동일한 카메라 프레이밍으로 캡처 (품종 비교용) */
export async function captureAlignedViews(
  url: string,
  cellSize: number,
  frames: AngleCaptureFrame[],
): Promise<CapturedViews> {
  return renderModelCaptures(url, cellSize, frames);
}

/** 단독 모델 캡처 (자동 프레이밍) */
export async function captureModelViews(
  url: string,
  cellSize: number,
): Promise<CapturedViews> {
  return renderModelCaptures(url, cellSize);
}
