import { useCallback, useEffect, useState } from "react";
import type { SpriteCompareResponse } from "../types";
import { runSpriteCompareClient } from "../utils/spriteCompareClient";
import { getViewUrl, type ViewEntry } from "./viewEntries";

interface SpriteAnalysisPanelProps {
  rootUrl: string | null;
  entries: ViewEntry[];
  onSpriteResults?: (results: SpriteCompareResponse) => void;
  onViewerSuspend?: (suspended: boolean) => void;
}

type AnalysisPhase = "idle" | "running" | "done" | "error";

export function SpriteAnalysisPanel({
  rootUrl,
  entries,
  onSpriteResults,
  onViewerSuspend,
}: SpriteAnalysisPanelProps) {
  const cultivarEntries = entries.filter((entry) => entry.kind === "cultivar");
  const cultivarCount = cultivarEntries.length;

  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    setError(null);
    setLastCount(null);
    setProgress(null);
    setPhase("idle");
  }, [entries, rootUrl]);

  useEffect(() => {
    onViewerSuspend?.(phase === "running");
  }, [phase, onViewerSuspend]);

  const runSpriteCompare = useCallback(async () => {
    if (!rootUrl || cultivarCount === 0) return;

    setError(null);
    setLastCount(null);
    setPhase("running");
    setProgress({ current: 0, total: cultivarCount });

    try {
      const response = await runSpriteCompareClient(
        rootUrl,
        cultivarEntries.map((entry, index) => ({
          id: entry.id,
          rank: index + 2,
          url: getViewUrl(entry),
        })),
        (current, total) => setProgress({ current, total }),
      );

      onSpriteResults?.(response);
      setLastCount(response.entries.length);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "스프라이트 비교 실패");
    } finally {
      setProgress(null);
    }
  }, [cultivarCount, cultivarEntries, onSpriteResults, rootUrl]);

  const busy = phase === "running";

  return (
    <div className="sprite-analysis-panel">
      <div className="sprite-analysis-header">
        <div>
          <h3>4각도 스프라이트 비교</h3>
          <p>
            원본과 동일한 카메라로 0°·90°·180°·270°를 캡처해 픽셀 차이를
            계산합니다. 분석 중에는 GPU 충돌 방지를 위해 3D 뷰어가 잠시 꺼집니다.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy || !rootUrl || cultivarCount === 0}
          onClick={runSpriteCompare}
        >
          {busy ? "비교 중…" : "스프라이트 비교"}
        </button>
      </div>

      {busy && progress && (
        <div className="sprite-export-progress">
          <div className="sprite-export-progress-bar">
            <div
              className="sprite-export-progress-bar-fill"
              style={{
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
              }}
            />
          </div>
          <span>
            4각도 캡처·비교 중… ({progress.current}/{progress.total} 품종)
          </span>
        </div>
      )}

      {error && <p className="status error">{error}</p>}

      {phase === "done" && lastCount != null && !busy && (
        <p className="sprite-analysis-done">
          비교 완료 · {lastCount}개 품종 · 왼쪽 목록에서 유사도 확인 (낮을수록
          유사)
        </p>
      )}
    </div>
  );
}
