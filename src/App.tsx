import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { cultivate, fetchPresetCount, finetune, recultivate } from "./api";
import { CultivarRowComparison } from "./components/CultivarRowComparison";
import { BatchFolderPanel } from "./components/BatchFolderPanel";
import { ParamEditor } from "./components/ParamEditor";
import type {
  BatchResult,
  CultivateResponse,
  CultivarResult,
  GltfpackParams,
  RootOriginal,
} from "./types";
import { formatBytes, formatNumber } from "./utils";
import "./App.css";

function appendResponse(
  data: CultivateResponse,
  setWorkspaceId: (id: string) => void,
  setRootOriginal: (r: RootOriginal) => void,
  setAllCultivars: Dispatch<SetStateAction<CultivarResult[]>>,
  setBatches: Dispatch<SetStateAction<BatchResult[]>>,
) {
  setWorkspaceId(data.workspaceId);
  setRootOriginal(data.rootOriginal);
  setAllCultivars((prev) => [...prev, ...data.batch.cultivars]);
  setBatches((prev) => [...prev, data.batch]);
}

function replaceWithBatch(
  data: CultivateResponse,
  setWorkspaceId: (id: string) => void,
  setRootOriginal: (r: RootOriginal) => void,
  setAllCultivars: Dispatch<SetStateAction<CultivarResult[]>>,
  setBatches: Dispatch<SetStateAction<BatchResult[]>>,
) {
  setWorkspaceId(data.workspaceId);
  setRootOriginal(data.rootOriginal);
  setAllCultivars(data.batch.cultivars);
  setBatches([data.batch]);
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [rootOriginal, setRootOriginal] = useState<RootOriginal | null>(null);
  const [allCultivars, setAllCultivars] = useState<CultivarResult[]>([]);
  const [batches, setBatches] = useState<BatchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tuneParams, setTuneParams] = useState<GltfpackParams>({});
  const [presetCount, setPresetCount] = useState<number | null>(null);

  const selected: CultivarResult | undefined =
    selectedId && selectedId !== "original"
      ? allCultivars.find((c) => c.id === selectedId)
      : undefined;

  useEffect(() => {
    fetchPresetCount()
      .then(setPresetCount)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selected) {
      setTuneParams({ ...selected.params });
    }
  }, [selectedId]);

  const resetWorkspace = () => {
    setWorkspaceId(null);
    setRootOriginal(null);
    setAllCultivars([]);
    setBatches([]);
    setSelectedId(null);
  };

  const handleCultivate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    resetWorkspace();

    try {
      const data = await cultivate(file);
      setWorkspaceId(data.workspaceId);
      setRootOriginal(data.rootOriginal);
      setAllCultivars(data.batch.cultivars);
      setBatches([data.batch]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecultivate = async () => {
    if (!workspaceId || !selected) return;

    setLoading(true);
    setError(null);

    try {
      const data = await recultivate(workspaceId, selected.id, selected.name);
      replaceWithBatch(
        data,
        setWorkspaceId,
        setRootOriginal,
        setAllCultivars,
        setBatches,
      );
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinetune = async (mode: "variants" | "exact") => {
    if (!workspaceId || !selected) return;

    setLoading(true);
    setError(null);

    try {
      const data = await finetune(
        workspaceId,
        selected.id,
        selected.name,
        tuneParams,
        mode,
      );
      appendResponse(
        data,
        setWorkspaceId,
        setRootOriginal,
        setAllCultivars,
        setBatches,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selected) return;
    const link = document.createElement("a");
    link.href = selected.outputUrl;
    link.download = `${selected.name.replace(/\s+/g, "_")}.glb`;
    link.click();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>LowPoly Cultivar</h1>
        <p>
          왼쪽 목록에서 선택하거나 3D 뷰에서 스크롤로 모델을 넘기며 비교하세요.
        </p>
      </header>

      <section className="panel">
        <div className="upload-row">
          <label className="file-label">
            <input
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? file.name : "Choose .glb / .gltf / .obj"}
          </label>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || loading}
            onClick={handleCultivate}
          >
            {loading
              ? "Generating..."
              : `Generate All${presetCount ? ` (${presetCount})` : ""}`}
          </button>
        </div>

        <p className="preset-hint">
          Classic · LOD · Compact · Balanced · Expert(Topology/SE/Border) 등{" "}
          {presetCount ?? "…"}개 <strong>지오메트리</strong> 프리셋을 한 번에
          생성합니다. WebP/KTX2 텍스처 최적화는 스프라이트로 선별한 뒤 별도 단계에서
          적용하세요.
        </p>

        {error && <p className="status error">{error}</p>}
        {loading && (
          <p className="status">
            gltfpack으로 모든 변형을 생성 중입니다. 모델 크기에 따라 수 분이
            걸릴 수 있습니다.
          </p>
        )}

        {rootOriginal && (
          <div className="original-summary">
            <div className="stat-chip">
              <strong>Workspace</strong>
              {allCultivars.length} cultivars · {batches.length} batches
            </div>
            <div className="stat-chip">
              <strong>Original</strong>
              {rootOriginal.name}
            </div>
            <div className="stat-chip">
              <strong>Triangles</strong>
              {formatNumber(rootOriginal.stats.triangles)}
            </div>
            <div className="stat-chip">
              <strong>File Size</strong>
              {formatBytes(rootOriginal.stats.fileSizeBytes)}
            </div>
          </div>
        )}
      </section>

      <BatchFolderPanel />

      <section className="grid-section">
        <h2>Cultivar Comparison</h2>
        <CultivarRowComparison
          workspaceId={workspaceId}
          rootOriginal={rootOriginal}
          batches={batches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          cultivars={allCultivars}
        />
      </section>

      {selected && workspaceId && (
        <>
          <section className="panel tune-panel">
            <ParamEditor params={tuneParams} onChange={setTuneParams} />
            <div className="tune-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => handleFinetune("variants")}
              >
                Generate Fine-tuned Variants
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => handleFinetune("exact")}
              >
                Apply Exact Params
              </button>
            </div>
          </section>

          <div className="selection-bar">
            <div className="info">
              Selected: <strong>{selected.name}</strong> —{" "}
              {formatNumber(selected.stats.triangles)} tris (
              {selected.reductionPercent}% vs original)
              <br />
              <span className="selection-params">{selected.paramsCommand}</span>
            </div>
            <div className="selection-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={handleRecultivate}
              >
                Re-cultivate All{presetCount ? ` (${presetCount})` : ""}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>
          <p className="chain-hint">
            Re-cultivate 시 선택 품종을 입력으로 모든 프리셋을 다시 생성하며,
            이전에 생성된 품종 목록은 새 결과로 교체됩니다.
          </p>
        </>
      )}
    </div>
  );
}
