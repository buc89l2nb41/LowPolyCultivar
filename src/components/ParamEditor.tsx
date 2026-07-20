import type { GltfpackParams } from "../types";

interface ParamEditorProps {
  params: GltfpackParams;
  onChange: (params: GltfpackParams) => void;
}

function num(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toggleFlag(
  params: GltfpackParams,
  key: keyof GltfpackParams,
  checked: boolean,
): GltfpackParams {
  return { ...params, [key]: checked ? true : undefined };
}

export function ParamEditor({ params, onChange }: ParamEditorProps) {
  const si = params.si ?? 0.85;
  const se = params.se ?? 0.01;
  const vp = params.vp ?? 14;
  const tl = params.tl ?? 512;
  const tq = params.tq ?? 6;

  const update = (patch: Partial<GltfpackParams>) => {
    onChange({ ...params, ...patch });
  };

  return (
    <div className="param-editor">
      <div className="param-editor-header">
        <h3>Fine-tune Parameters</h3>
        <p>
          gltfpack-lod.md 기준: UV 보존 시 <strong>-sp 끄기</strong>, 중저면수는{" "}
          <strong>-sa -se 0.1</strong>, 용량은 <strong>-tw -tl</strong> 사용.
        </p>
      </div>

      <div className="param-grid">
        <label className="param-field">
          <span>
            <strong>-si</strong> Simplify ratio
            <em>{si.toFixed(2)}</em>
          </span>
          <input
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            value={si}
            onChange={(e) => update({ si: num(e.target.value, si) })}
          />
        </label>

        <label className="param-field">
          <span>
            <strong>-se</strong> Simplify error
            <em>{se.toFixed(3)}</em>
          </span>
          <input
            type="range"
            min={0.001}
            max={0.5}
            step={0.001}
            value={se}
            onChange={(e) => update({ se: num(e.target.value, se) })}
          />
        </label>

        <label className="param-field">
          <span>
            <strong>-vp</strong> Position bits
            <em>{vp}</em>
          </span>
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={vp}
            onChange={(e) => update({ vp: num(e.target.value, vp) })}
          />
        </label>

        <label className="param-field">
          <span>
            <strong>-tl</strong> Texture max px
            <em>{tl}</em>
          </span>
          <input
            type="range"
            min={128}
            max={1024}
            step={128}
            value={tl}
            onChange={(e) => update({ tl: num(e.target.value, tl), tw: true })}
          />
        </label>

        <label className="param-field">
          <span>
            <strong>-tq</strong> Texture quality
            <em>{tq}</em>
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={tq}
            onChange={(e) => update({ tq: num(e.target.value, tq), tw: true })}
          />
        </label>

        <div className="param-checks">
          <label className="param-check">
            <input
              type="checkbox"
              checked={Boolean(params.sa)}
              onChange={(e) => onChange(toggleFlag(params, "sa", e.target.checked))}
            />
            <span>-sa Aggressive simplify</span>
          </label>
          <label className="param-check param-check-warn">
            <input
              type="checkbox"
              checked={Boolean(params.sp)}
              onChange={(e) => onChange(toggleFlag(params, "sp", e.target.checked))}
            />
            <span>-sp UV seam cross (텍스처 깨짐 위험)</span>
          </label>
          <label className="param-check">
            <input
              type="checkbox"
              checked={Boolean(params.cc ?? params.c)}
              onChange={(e) =>
                update({ cc: e.target.checked ? true : undefined, c: undefined })
              }
            />
            <span>-cc Meshopt compression</span>
          </label>
          <label className="param-check">
            <input
              type="checkbox"
              checked={Boolean(params.tw)}
              onChange={(e) => onChange(toggleFlag(params, "tw", e.target.checked))}
            />
            <span>-tw WebP textures</span>
          </label>
        </div>
      </div>
    </div>
  );
}
