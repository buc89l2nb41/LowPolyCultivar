export interface GltfpackParams {
  si?: number;
  se?: number;
  vp?: number;
  vt?: number;
  vn?: number;
  sa?: boolean;
  sp?: boolean;
  slb?: boolean;
  kn?: boolean;
  km?: boolean;
  tc?: boolean;
  tw?: boolean;
  tl?: number;
  ts?: number;
  tq?: number;
  c?: boolean;
  cc?: boolean;
}

export interface MeshStats {
  vertices: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  animations: number;
  fileSizeBytes: number;
  drawCallsEstimate: number;
  textureBytes: number;
  vertexTriangleDelta: number;
  vertexTriangleRatio: number;
}

export interface CultivarResult {
  id: string;
  batchId: string;
  name: string;
  description: string;
  params: GltfpackParams;
  paramsLabel: string;
  paramsCommand: string;
  presetGroupLabel: string;
  sourceModel: string;
  outputUrl: string;
  stats: MeshStats;
  reductionPercent: number;
  uvWarning: string | null;
  isOriginal: boolean;
}

export interface RootOriginal {
  name: string;
  stats: MeshStats;
  previewUrl: string;
}

export interface BatchResult {
  id: string;
  label: string;
  presetGroupId: string;
  sourceCultivarId: string | null;
  sourceName: string | null;
  cultivars: CultivarResult[];
}

export interface CultivateResponse {
  workspaceId: string;
  rootOriginal: RootOriginal;
  batch: BatchResult;
}

export type SpriteVerdict = "similar" | "caution" | "different";

export interface SpriteEntryResult {
  id: string;
  rank: number;
  meanDiff: number;
  maxDiff: number;
  perAngle: number[];
}

export interface SpriteCompareResponse {
  cellSize: number;
  angleCount: number;
  entries: SpriteEntryResult[];
}
