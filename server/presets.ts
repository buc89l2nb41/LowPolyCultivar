import type { GltfpackParams, VariantPreset } from "./types.js";

function formatParamNum(value: number): string {
  if (value === 1) return "1";
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

/** UI·품종명용 — gltfpack 플래그를 그대로 읽을 수 있는 라벨 */
export function formatPresetDisplayName(params: GltfpackParams): string {
  const parts: string[] = [];

  if (params.si !== undefined) parts.push(`si ${formatParamNum(params.si)}`);
  if (params.sa) parts.push("sa");
  if (params.sp) parts.push("sp");
  if (params.slb) parts.push("slb");
  if (params.se !== undefined) parts.push(`se ${formatParamNum(params.se)}`);
  if (params.vp !== undefined) parts.push(`vp ${params.vp}`);
  if (params.vt !== undefined) parts.push(`vt ${params.vt}`);
  if (params.vn !== undefined) parts.push(`vn ${params.vn}`);
  if (params.tw) parts.push("tw");
  if (params.tl !== undefined) parts.push(`tl ${params.tl}`);
  if (params.ts !== undefined) parts.push(`ts ${formatParamNum(params.ts)}`);
  if (params.tq !== undefined) parts.push(`tq ${params.tq}`);
  if (params.tc) parts.push("tc");
  if (params.kn) parts.push("kn");
  if (params.km) parts.push("km");
  if (params.cc) parts.push("cc");
  else if (params.c) parts.push("c");

  return parts.length > 0 ? parts.join(" · ") : "gltfpack";
}

function definePreset(
  id: string,
  description: string,
  params: GltfpackParams,
): VariantPreset {
  return {
    id,
    name: formatPresetDisplayName(params),
    description,
    params,
  };
}

export interface PresetGroup {
  id: string;
  label: string;
  description: string;
  presets: VariantPreset[];
  /** Re-cultivate 시 자동 추천 */
  forChain?: boolean;
  /** geometry = 1차(스프라이트 선별 전), texture = 2차(엄선 후) */
  phase?: "geometry" | "texture";
}

/** gltfpack-lod.md 적용 전 초기 탐색 방식 (si/vp/se 그리드, Mobile은 -c) */
export const CLASSIC_PRESETS: VariantPreset[] = [
  definePreset("quality-high", "최소 단순화, 높은 정밀도", {
    si: 0.95,
    vp: 16,
    se: 0.005,
  }),
  definePreset("quality-mid", "약한 단순화", { si: 0.9, vp: 15, se: 0.01 }),
  definePreset("balanced", "품질과 용량의 균형", { si: 0.85, vp: 14, se: 0.01 }),
  definePreset("balanced-low", "조금 더 공격적인 균형", {
    si: 0.75,
    vp: 13,
    se: 0.015,
  }),
  definePreset("aggressive", "공격적 단순화", { si: 0.6, vp: 12, se: 0.02 }),
  definePreset("mobile", "모바일 타깃 (-c 압축)", {
    si: 0.5,
    vp: 11,
    vn: 8,
    c: true,
  }),
];

export const GENERAL_PRESETS: VariantPreset[] = [
  definePreset("quality-high", "최소 단순화, 높은 정밀도", {
    si: 0.95,
    vp: 16,
    se: 0.005,
  }),
  definePreset("quality-mid", "약한 단순화", { si: 0.9, vp: 15, se: 0.01 }),
  definePreset("balanced", "품질과 용량의 균형", { si: 0.85, vp: 14, se: 0.01 }),
  definePreset("balanced-low", "조금 더 공격적인 균형", {
    si: 0.75,
    vp: 13,
    se: 0.015,
  }),
  definePreset("aggressive", "공격적 단순화", { si: 0.6, vp: 12, se: 0.02 }),
  definePreset("mobile", "모바일 타깃, meshopt 압축", {
    si: 0.5,
    vp: 11,
    vn: 8,
    cc: true,
  }),
];

/** gltfpack-lod.md 실험1: Trellis ~50k → 기준 LOD */
const LOD_FIRST_PASS: VariantPreset[] = [
  definePreset("lod-25k", "원본의 약 50% 면 수 (실험1)", { si: 0.501, cc: true }),
  definePreset("lod-10k", "원본의 약 20% 면 수", { si: 0.2, cc: true }),
  definePreset("lod-5k", "원본의 약 10% 면 수", { si: 0.1, cc: true }),
  definePreset("lod-2500", "저면수 구간 진입 (-sa 필요)", {
    si: 0.05,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("lod-1000", "기준 품종 후보 (1k 근처)", {
    si: 0.02,
    sa: true,
    se: 0.1,
    cc: true,
  }),
];

/** gltfpack-lod.md 실험2: 기준 품종에서 비율 체인 */
const LOD_CHAIN: VariantPreset[] = [
  definePreset("chain-750", "입력의 75% 면 수", {
    si: 0.75,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-500", "입력의 50% 면 수 · UV 보존 체인", {
    si: 0.5,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-250", "입력의 25% 면 수", {
    si: 0.25,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-100", "입력의 10% 면 수", {
    si: 0.1,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-50", "입력의 5% 면 수 (UV 보존 바닥 근처)", {
    si: 0.05,
    sa: true,
    se: 0.1,
    cc: true,
  }),
];

/** gltfpack-lod.md 실험6: compact — 면 수 (1차는 지오메트리만, 텍스처는 2차) */
const LOD_COMPACT: VariantPreset[] = [
  definePreset("compact-500", "50% 면 + WebP 512", {
    si: 0.5,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 512,
    tq: 6,
  }),
  definePreset("compact-250", "25% 면 + WebP 512", {
    si: 0.25,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 512,
    tq: 6,
  }),
  definePreset("compact-150", "15% 면 + WebP 256", {
    si: 0.15,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 256,
    tq: 5,
  }),
  definePreset("compact-100", "10% 면 + WebP 256", {
    si: 0.1,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 256,
    tq: 4,
  }),
  definePreset("compact-50", "5% 면 + WebP 128", {
    si: 0.05,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 128,
    tq: 4,
  }),
];

/** gltfpack-lod.md 실험3: 극저 LOD — 텍스처 깨짐 감수 */
const LOD_AGGRESSIVE: VariantPreset[] = [
  definePreset("aggr-250", "⚠ -sp 사용, UV 깨짐 위험", {
    si: 0.25,
    sa: true,
    sp: true,
    se: 0.5,
    cc: true,
  }),
  definePreset("aggr-100", "⚠ -sp -se 0.5", {
    si: 0.1,
    sa: true,
    sp: true,
    se: 0.5,
    cc: true,
  }),
  definePreset("aggr-50", "⚠ 극저면, 텍스처 스크램블 가능", {
    si: 0.05,
    sa: true,
    sp: true,
    se: 0.5,
    cc: true,
  }),
];

/**
 * gltfpack-lod.md 실험4 + |v−t| 최소화 체인.
 * Liu et al. 2017 / Garland & Heckbert 1998: 속성(UV) 보존 시 급격한 붕괴 방지.
 */
const LOD_BALANCED: VariantPreset[] = [
  definePreset("balanced-750", "v≈t 균형 탐색 (si 미세조정)", {
    si: 0.72,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("balanced-500", "|v−t| 작은 후보 탐색", {
    si: 0.47,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("balanced-400", "gltfpack-lod.md balanced 실험", {
    si: 0.38,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("balanced-350", "v≈t 균형 중간 단계", {
    si: 0.33,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("balanced-300", "v≈t 균형 중간 단계", {
    si: 0.28,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("balanced-250", "UV 보존 하한 탐색", {
    si: 0.22,
    sa: true,
    se: 0.1,
    cc: true,
  }),
];

const LOD_CHAIN_EXTENDED: VariantPreset[] = [
  definePreset("chain-400", "입력의 40% 면 수", {
    si: 0.4,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-350", "입력의 35% 면 수", {
    si: 0.35,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("chain-300", "입력의 30% 면 수", {
    si: 0.3,
    sa: true,
    se: 0.1,
    cc: true,
  }),
];

const LOD_FIRST_EXTENDED: VariantPreset[] = [
  definePreset("lod-15k", "원본의 약 30% 면 수", { si: 0.3, cc: true }),
  definePreset("lod-3k", "원본의 약 6% 면 수", {
    si: 0.06,
    sa: true,
    se: 0.1,
    cc: true,
  }),
  definePreset("lod-500", "원본 직통 저면수 (체인과 비교용)", {
    si: 0.01,
    sa: true,
    se: 0.1,
    cc: true,
  }),
];

const LOD_COMPACT_EXTENDED: VariantPreset[] = [
  definePreset("compact-1000", "면 유지 + WebP 1024", {
    si: 1,
    cc: true,
    tw: true,
    tl: 1024,
    tq: 7,
  }),
  definePreset("compact-750", "75% 면 + WebP 1024", {
    si: 0.75,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 1024,
    tq: 7,
  }),
  definePreset("compact-400", "40% 면 + WebP 512", {
    si: 0.4,
    sa: true,
    se: 0.1,
    cc: true,
    tw: true,
    tl: 512,
    tq: 6,
  }),
];

const EXPERT_TOPOLOGY: VariantPreset[] = [
  definePreset("gentle-75", "Topology-safe · meshoptimizer 기본 -se", {
    si: 0.75,
    se: 0.01,
    cc: true,
  }),
  definePreset("gentle-50", "UV 우선 · -sa/-sp 없음", { si: 0.5, se: 0.01, cc: true }),
  definePreset("gentle-25", "보수적 체인 2단", { si: 0.25, se: 0.01, cc: true }),
  definePreset("gentle-10", "보수적 저면수 시도", { si: 0.1, se: 0.01, cc: true }),
];

const EXPERT_SE_REFINE: VariantPreset[] = [
  definePreset("chain-500-se01", "gltfpack 기본 오차 1%", {
    si: 0.5,
    sa: true,
    se: 0.01,
    cc: true,
  }),
  definePreset("chain-250-se01", "형태/UV 보수", {
    si: 0.25,
    sa: true,
    se: 0.01,
    cc: true,
  }),
  definePreset("chain-500-se05", "오차 중간값 (UV 타이트)", {
    si: 0.5,
    sa: true,
    se: 0.05,
    cc: true,
  }),
  definePreset("chain-250-se05", "오차 중간값", {
    si: 0.25,
    sa: true,
    se: 0.05,
    cc: true,
  }),
];

const EXPERT_BORDER: VariantPreset[] = [
  definePreset("border-500", "-slb 경계 고정", {
    si: 0.5,
    sa: true,
    se: 0.1,
    slb: true,
    cc: true,
  }),
  definePreset("border-250", "-slb UV seam 경계 보호", {
    si: 0.25,
    sa: true,
    se: 0.1,
    slb: true,
    cc: true,
  }),
];

const EXPERT_ATTR_PRECISION: VariantPreset[] = [
  definePreset("attr-safe-500", "Garland QEM · vp16 vt14", {
    si: 0.5,
    sa: true,
    se: 0.05,
    vp: 16,
    vt: 14,
    vn: 10,
    cc: true,
  }),
  definePreset("attr-safe-250", "텍스처 좌표 고정밀 양자화", {
    si: 0.25,
    sa: true,
    se: 0.05,
    vp: 16,
    vt: 14,
    vn: 10,
    cc: true,
  }),
];

const EXPERT_STRUCTURE: VariantPreset[] = [
  definePreset("named-1k", "-kn -km 구조 보존", {
    si: 0.02,
    sa: true,
    se: 0.1,
    kn: true,
    km: true,
    cc: true,
  }),
  definePreset("named-500", "50% 면 + 구조 보존", {
    si: 0.5,
    sa: true,
    se: 0.1,
    kn: true,
    km: true,
    cc: true,
  }),
];

const EXPERT_KTX2: VariantPreset[] = [
  definePreset("ktx2-500", "50% 면 + BasisU KTX2", {
    si: 0.5,
    sa: true,
    se: 0.1,
    cc: true,
    tc: true,
    tq: 6,
  }),
  definePreset("ktx2-tex-only", "면 유지, KTX2 텍스처만", {
    si: 1,
    cc: true,
    tc: true,
    tq: 6,
  }),
];

const TEXTURE_ONLY: VariantPreset[] = [
  definePreset("tex-1024", "면 유지, WebP 1024px", {
    si: 1,
    cc: true,
    tw: true,
    tl: 1024,
    tq: 7,
  }),
  definePreset("tex-512", "면 유지, WebP 512px", {
    si: 1,
    cc: true,
    tw: true,
    tl: 512,
    tq: 6,
  }),
  definePreset("tex-256", "면 유지, WebP 256px", {
    si: 1,
    cc: true,
    tw: true,
    tl: 256,
    tq: 4,
  }),
  definePreset("tex-128", "면 유지, WebP 128px", {
    si: 1,
    cc: true,
    tw: true,
    tl: 128,
    tq: 4,
  }),
  definePreset("tex-ts-half", "면 유지, -ts 0.5 WebP", {
    si: 1,
    cc: true,
    tw: true,
    ts: 0.5,
    tq: 5,
  }),
];

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: "classic",
    label: "Classic (초기 탐색)",
    description:
      "gltfpack-lod.md 적용 전 방식. si/vp/se 조합으로 품종 탐색",
    presets: CLASSIC_PRESETS,
  },
  {
    id: "lod-first",
    label: "LOD 1차 (50k→1k)",
    description: "Trellis 원본에서 기준 LOD까지. gltfpack-lod.md 실험1",
    presets: LOD_FIRST_PASS,
  },
  {
    id: "lod-chain",
    label: "LOD 체인 (기준→)",
    description: "선택 품종에서 단계별 감소. Re-cultivate와 함께 사용",
    presets: LOD_CHAIN,
    forChain: true,
  },
  {
    id: "lod-compact",
    label: "Compact (면)",
    description: "저면수 구간. WebP/KTX2는 스프라이트 선별 후 texture 프리셋으로",
    presets: LOD_COMPACT,
    forChain: true,
    phase: "geometry",
  },
  {
    id: "general",
    label: "General",
    description: "범용 품질/용량 프리셋",
    presets: GENERAL_PRESETS,
  },
  {
    id: "texture-only",
    label: "Texture Only",
    description: "면 수 유지, 텍스처 용량만 축소 (스프라이트 선별 후 2차)",
    presets: TEXTURE_ONLY,
    phase: "texture",
  },
  {
    id: "lod-aggressive",
    label: "Aggressive (UV 위험)",
    description: "-sp 사용. 텍스처 깨짐 감수 시만",
    presets: LOD_AGGRESSIVE,
  },
  {
    id: "lod-balanced",
    label: "Balanced (v/t 균형)",
    description: "gltfpack-lod.md 실험4 · |v−t| 최소화 탐색",
    presets: LOD_BALANCED,
    forChain: true,
  },
  {
    id: "lod-chain-ext",
    label: "LOD 체인 보완",
    description: "400/350/300 중간 단계",
    presets: LOD_CHAIN_EXTENDED,
    forChain: true,
  },
  {
    id: "lod-first-ext",
    label: "LOD 1차 보완",
    description: "15k/3k/500 직통 보완",
    presets: LOD_FIRST_EXTENDED,
  },
  {
    id: "lod-compact-ext",
    label: "Compact 보완",
    description: "1000/750/400 compact 면 수 (텍스처는 2차)",
    presets: LOD_COMPACT_EXTENDED,
    forChain: true,
    phase: "geometry",
  },
  {
    id: "expert-topology",
    label: "Expert: Topology-Safe",
    description:
      "meshoptimizer #749 · -sa/-sp 없음, -se 0.01 기본 오차",
    presets: EXPERT_TOPOLOGY,
  },
  {
    id: "expert-se",
    label: "Expert: Error Refine",
    description: "gltfpack -se 0.01/0.05 스윕 · Garland QEM 저오차",
    presets: EXPERT_SE_REFINE,
    forChain: true,
  },
  {
    id: "expert-border",
    label: "Expert: Border Lock",
    description: "gltfpack -slb · Liu 2017 seam 경계 보호 유사",
    presets: EXPERT_BORDER,
    forChain: true,
  },
  {
    id: "expert-attr",
    label: "Expert: Attr Precision",
    description: "Garland & Heckbert 1998 · vp16/vt14 UV 정밀도",
    presets: EXPERT_ATTR_PRECISION,
    forChain: true,
  },
  {
    id: "expert-structure",
    label: "Expert: Structure",
    description: "gltfpack -kn/-km · 노드/머티리얼 이름 보존",
    presets: EXPERT_STRUCTURE,
    forChain: true,
  },
  {
    id: "expert-ktx2",
    label: "Expert: KTX2/BasisU",
    description: "Khronos KTX2 (-tc) · 스프라이트 선별 후 2차",
    presets: EXPERT_KTX2,
    forChain: true,
    phase: "texture",
  },
];

export const DEFAULT_PRESET_GROUP_ID = "classic";

const TEXTURE_PARAM_KEYS = ["tc", "tw", "tl", "ts", "tq"] as const;

/** 1차 생성에서 제거할 텍스처 압축 플래그 */
export function stripTextureParams(params: GltfpackParams): GltfpackParams {
  const next = { ...params };
  for (const key of TEXTURE_PARAM_KEYS) {
    delete next[key];
  }
  return next;
}

function flattenPresetGroups(
  groups: readonly PresetGroup[],
  options?: { stripTexture?: boolean },
): VariantPreset[] {
  const all: VariantPreset[] = [];

  for (const group of groups) {
    for (const preset of group.presets) {
      const params = options?.stripTexture
        ? stripTextureParams(preset.params)
        : preset.params;
      all.push({
        ...preset,
        id: `${group.id}__${preset.id}`,
        name: formatPresetDisplayName(params),
        params,
        groupId: group.id,
        groupLabel: group.label,
      });
    }
  }

  return all;
}

/** 1차: 트라이앵글/버텍스·LOD만 (스프라이트 선별용) */
export function getGeometryPresets(): VariantPreset[] {
  const geometryGroups = PRESET_GROUPS.filter(
    (group) => group.phase !== "texture",
  );
  return flattenPresetGroups(geometryGroups, { stripTexture: true });
}

/** 2차: 스프라이트로 엄선한 품종에 텍스처 최적화 적용용 */
export function getTexturePresets(): VariantPreset[] {
  const textureGroups = PRESET_GROUPS.filter(
    (group) => group.phase === "texture",
  );
  return flattenPresetGroups(textureGroups);
}

/** 3차 배치: 면 수 유지(si=1) 텍스처 프리셋만 */
export function getTextureOptimizationPresets(): VariantPreset[] {
  return getTexturePresets().filter((preset) => preset.params.si === 1);
}

export function getPresetGroup(id: string): PresetGroup {
  return PRESET_GROUPS.find((g) => g.id === id) ?? PRESET_GROUPS[0];
}

/** Generate All / Re-cultivate All — geometry only */
export function getAllPresets(): VariantPreset[] {
  return getGeometryPresets();
}

export const ALL_PRESETS = getAllPresets();
export const ALL_PRESET_COUNT = ALL_PRESETS.length;
export const TEXTURE_PRESET_COUNT = getTexturePresets().length;
export const TEXTURE_OPTIMIZATION_PRESET_COUNT =
  getTextureOptimizationPresets().length;

export function getChainPresetGroup(): PresetGroup {
  return PRESET_GROUPS.find((g) => g.forChain && g.id === "lod-chain")!;
}

export function paramsToArgs(params: GltfpackParams): string[] {
  const args: string[] = [];
  if (params.si !== undefined) args.push("-si", String(params.si));
  if (params.se !== undefined) args.push("-se", String(params.se));
  if (params.vp !== undefined) args.push("-vp", String(params.vp));
  if (params.vt !== undefined) args.push("-vt", String(params.vt));
  if (params.vn !== undefined) args.push("-vn", String(params.vn));
  if (params.sa) args.push("-sa");
  if (params.sp) args.push("-sp");
  if (params.slb) args.push("-slb");
  if (params.kn) args.push("-kn");
  if (params.km) args.push("-km");
  if (params.tc) args.push("-tc");
  if (params.tw) args.push("-tw");
  if (params.tl !== undefined) args.push("-tl", String(params.tl));
  if (params.ts !== undefined) args.push("-ts", String(params.ts));
  if (params.tq !== undefined) args.push("-tq", String(params.tq));
  if (params.cc) args.push("-cc");
  else if (params.c) args.push("-c");
  return args;
}

export function paramsToLabel(params: GltfpackParams): string {
  return formatPresetDisplayName(params);
}

export function paramsToCommand(params: GltfpackParams): string {
  const args = paramsToArgs(params);
  return args.length > 0 ? `gltfpack ${args.join(" ")}` : "gltfpack (no extra flags)";
}

export function assessUvRisk(
  params: GltfpackParams,
  vertices: number,
  triangles: number,
): string | null {
  if (params.sp) {
    return "-sp: attribute discontinuity 무시 → UV 스크램블 위험";
  }
  if (params.sa) {
    return "-sa: aggressive simplification → UV/텍스처 왜곡 가능 (meshoptimizer #866)";
  }
  if (params.se !== undefined && params.se >= 0.5) {
    return "높은 -se: 형태/UV 오차 허용 큼";
  }
  if (triangles > 0) {
    const ratio = vertices / triangles;
    if (ratio < 0.7) {
      return `v/t ${ratio.toFixed(2)}: UV 왜곡 가능 (1.0에 가까울수록 양호)`;
    }
  }
  return null;
}

export function meshBalanceScore(vertices: number, triangles: number): {
  delta: number;
  ratio: number;
} {
  return {
    delta: Math.abs(vertices - triangles),
    ratio: triangles > 0 ? vertices / triangles : 0,
  };
}
