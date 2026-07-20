import type { CultivarResult, RootOriginal } from "../types";
import { formatBytes, formatNumber } from "../utils";

interface CultivarDetailPanelProps {
  selectedId: string | null;
  rootOriginal: RootOriginal | null;
  cultivars: CultivarResult[];
  rank: number | null;
}

export function CultivarDetailPanel({
  selectedId,
  rootOriginal,
  cultivars,
  rank,
}: CultivarDetailPanelProps) {
  if (!selectedId) return null;

  if (selectedId === "original" && rootOriginal) {
    const s = rootOriginal.stats;
    return (
      <section className="panel detail-panel">
        <h3>
          원본 (Original)
          {rank !== null && <span className="detail-rank">#{rank}</span>}
        </h3>
        <p className="detail-desc">모든 품종 비교의 기준점 · {rootOriginal.name}</p>
        <div className="detail-stats-grid">
          <div><span>Vertices</span><strong>{formatNumber(s.vertices)}</strong></div>
          <div><span>Triangles</span><strong>{formatNumber(s.triangles)}</strong></div>
          <div><span>|v−t|</span><strong>{formatNumber(s.vertexTriangleDelta)}</strong></div>
          <div><span>v/t ratio</span><strong>{s.vertexTriangleRatio.toFixed(3)}</strong></div>
          <div><span>File size</span><strong>{formatBytes(s.fileSizeBytes)}</strong></div>
          <div><span>Materials</span><strong>{formatNumber(s.materials)}</strong></div>
          <div><span>Textures</span><strong>{formatNumber(s.textures)} ({formatBytes(s.textureBytes)})</strong></div>
          <div><span>Draw calls</span><strong>{formatNumber(s.drawCallsEstimate)}</strong></div>
          <div><span>Meshes</span><strong>{formatNumber(s.meshes)}</strong></div>
        </div>
      </section>
    );
  }

  const cultivar = cultivars.find((c) => c.id === selectedId);
  if (!cultivar) return null;

  const s = cultivar.stats;

  return (
    <section className="panel detail-panel">
      <h3>
        {cultivar.name}
        {rank !== null && <span className="detail-rank">#{rank}</span>}
        <span className="detail-tag">{cultivar.presetGroupLabel}</span>
      </h3>
      <p className="detail-desc">{cultivar.description}</p>

      <div className="detail-meta">
        <span>입력 모델: {cultivar.sourceModel}</span>
      </div>

      <div className="params-command">{cultivar.paramsCommand}</div>
      <div className="params">{cultivar.paramsLabel}</div>

      {cultivar.uvWarning && (
        <div className="uv-warning">{cultivar.uvWarning}</div>
      )}

      <div className="detail-stats-grid">
        <div><span>Vertices</span><strong>{formatNumber(s.vertices)}</strong></div>
        <div><span>Triangles</span><strong>{formatNumber(s.triangles)}</strong></div>
        <div><span>Reduction</span><strong className="reduction-value">{cultivar.reductionPercent}%</strong></div>
        <div><span>|v−t|</span><strong>{formatNumber(s.vertexTriangleDelta)}</strong></div>
        <div><span>v/t ratio</span><strong>{s.vertexTriangleRatio.toFixed(3)}</strong></div>
        <div><span>File size</span><strong>{formatBytes(s.fileSizeBytes)}</strong></div>
        <div><span>Meshes</span><strong>{formatNumber(s.meshes)}</strong></div>
        <div><span>Materials</span><strong>{formatNumber(s.materials)}</strong></div>
        <div><span>Textures</span><strong>{formatNumber(s.textures)} ({formatBytes(s.textureBytes)})</strong></div>
        <div><span>Draw calls</span><strong>{formatNumber(s.drawCallsEstimate)}</strong></div>
        <div><span>Animations</span><strong>{formatNumber(s.animations)}</strong></div>
      </div>
    </section>
  );
}
