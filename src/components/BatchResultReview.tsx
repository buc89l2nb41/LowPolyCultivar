import { useEffect, useMemo, useState } from "react";
import type { BatchManifestItem } from "../api";
import { ModelCanvas } from "./ModelCanvas";
import { formatBytes, formatNumber } from "../utils";

interface BatchResultReviewProps {
  runId: string;
  items: BatchManifestItem[];
  originalUrls?: ReadonlyMap<string, string>;
}

function statusLabel(status: BatchManifestItem["status"]): string {
  if (status === "ok") return "완료";
  if (status === "fallback_original") return "원본 fallback";
  return "실패";
}

function statusClass(status: BatchManifestItem["status"]): string {
  if (status === "ok") return "batch-review-status-ok";
  if (status === "fallback_original") return "batch-review-status-fallback";
  return "batch-review-status-failed";
}

export function BatchResultReview({ runId, items, originalUrls }: BatchResultReviewProps) {
  const [index, setIndex] = useState(0);

  const reviewItems = useMemo(
    () => items.filter((item) => item.originalFile),
    [items],
  );

  useEffect(() => {
    if (index > reviewItems.length - 1) {
      setIndex(Math.max(0, reviewItems.length - 1));
    }
  }, [index, reviewItems.length]);

  if (reviewItems.length === 0) return null;

  const safeIndex = Math.min(index, reviewItems.length - 1);
  const item = reviewItems[safeIndex];
  const originalUrl = originalUrls?.get(item.originalFile) ?? null;
  const resultUrl =
    item.output != null
      ? `/output/${runId}/${encodeURIComponent(item.output)}`
      : null;

  const goPrev = () => {
    setIndex((prev) => (prev <= 0 ? reviewItems.length - 1 : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev >= reviewItems.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="batch-result-review">
      <div className="batch-result-review-header">
        <h3>원본 · 결과 비교</h3>
        <p className="batch-result-review-hint">
          처리가 끝난 모델을 원본과 나란히 확인할 수 있습니다.
        </p>
      </div>

      <div className="batch-result-review-layout">
        <aside className="batch-result-review-list">
          {reviewItems.map((entry, entryIndex) => (
            <button
              key={entry.originalFile}
              type="button"
              className={`batch-result-review-item ${entryIndex === safeIndex ? "active" : ""}`}
              onClick={() => setIndex(entryIndex)}
            >
              <span className="batch-result-review-item-name">{entry.originalFile}</span>
              <span className={`batch-result-review-status ${statusClass(entry.status)}`}>
                {statusLabel(entry.status)}
              </span>
            </button>
          ))}
        </aside>

        <div className="batch-result-review-main">
          <div className="batch-result-review-nav">
            <button type="button" className="btn btn-secondary btn-sm" onClick={goPrev}>
              ← 이전
            </button>
            <span className="viewer-nav-label">
              {safeIndex + 1} / {reviewItems.length} · {item.originalFile}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={goNext}>
              다음 →
            </button>
          </div>

          <div className="batch-result-review-meta">
            <span className={`batch-result-review-status ${statusClass(item.status)}`}>
              {statusLabel(item.status)}
            </span>
            {item.originalTriangles > 0 && (
              <span>
                tris {formatNumber(item.originalTriangles)}
                {item.finalTriangles != null
                  ? ` → ${formatNumber(item.finalTriangles)}`
                  : ""}
              </span>
            )}
            {item.finalFileSizeBytes != null && (
              <span>결과 {formatBytes(item.finalFileSizeBytes)}</span>
            )}
            {item.pass3?.selectedPresetId && (
              <span>텍스처 {item.pass3.selectedPresetId}</span>
            )}
            {item.error && <span className="batch-result-review-error">{item.error}</span>}
          </div>

          <div className="batch-result-review-panels">
            <div className="batch-result-review-panel">
              <div className="batch-result-review-panel-head">
                <span className="viewer-tag original">원본</span>
                <span>{item.originalFile}</span>
              </div>
              <div className="batch-result-review-canvas">
                {originalUrl ? (
                  <ModelCanvas url={originalUrl} />
                ) : (
                  <div className="batch-result-review-empty">원본 미리보기 없음</div>
                )}
              </div>
            </div>

            <div className="batch-result-review-panel">
              <div className="batch-result-review-panel-head">
                <span className="viewer-tag">결과</span>
                <span>{item.output ?? "—"}</span>
              </div>
              <div className="batch-result-review-canvas">
                {resultUrl ? (
                  <ModelCanvas url={resultUrl} />
                ) : (
                  <div className="batch-result-review-empty">결과 파일 없음</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
