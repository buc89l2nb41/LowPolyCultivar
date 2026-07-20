import { formatPresetDisplayName } from "./presets.js";
import type { GltfpackParams, VariantPreset } from "./types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function withDefaults(base: GltfpackParams): Required<
  Pick<GltfpackParams, "si" | "se" | "vp">
> &
  GltfpackParams {
  return {
    si: 0.85,
    se: 0.01,
    vp: 14,
    ...base,
  };
}

function preset(
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

export function generateFineTunePresets(
  base: GltfpackParams,
  _baseName: string,
): VariantPreset[] {
  const p = withDefaults(base);
  const variants: VariantPreset[] = [
    preset("tune-base", "편집한 기준 파라미터", { ...base }),
  ];

  const siDown = round3(clamp(p.si - 0.05, 0.1, 1));
  if (siDown !== p.si) {
    variants.push(
      preset("tune-si-down", "단순화 약간 감소 (품질↑)", {
        ...base,
        si: siDown,
      }),
    );
  }

  const siUp = round3(clamp(p.si + 0.05, 0.1, 1));
  if (siUp !== p.si) {
    variants.push(
      preset("tune-si-up", "단순화 약간 증가 (용량↓)", {
        ...base,
        si: siUp,
      }),
    );
  }

  const vpDown = clamp(p.vp - 1, 1, 16);
  if (vpDown !== p.vp) {
    variants.push(
      preset("tune-vp-down", "위치 정밀도 감소", {
        ...base,
        vp: vpDown,
      }),
    );
  }

  const vpUp = clamp(p.vp + 1, 1, 16);
  if (vpUp !== p.vp) {
    variants.push(
      preset("tune-vp-up", "위치 정밀도 증가", {
        ...base,
        vp: vpUp,
      }),
    );
  }

  const seTight = round3(clamp(p.se * 0.5, 0.001, 1));
  if (seTight !== p.se) {
    variants.push(
      preset("tune-se-tight", "오차 허용 축소 (품질↑)", {
        ...base,
        se: seTight,
      }),
    );
  }

  const seLoose = round3(clamp(p.se * 2, 0.001, 1));
  if (seLoose !== p.se) {
    variants.push(
      preset("tune-se-loose", "오차 허용 확대 (용량↓)", {
        ...base,
        se: seLoose,
      }),
    );
  }

  return variants;
}

export function generateExactPreset(
  base: GltfpackParams,
  _baseName: string,
): VariantPreset[] {
  return [preset("custom-exact", "사용자 지정 파라미터", { ...base })];
}
