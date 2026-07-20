import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBatchJob,
  startBatchFromUpload,
  type BatchJobState,
} from "../api";
import { BatchResultReview } from "./BatchResultReview";

function countGlbFiles(fileList: FileList | null): number {
  if (!fileList) return 0;
  let count = 0;
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.name.toLowerCase().endsWith(".glb")) count += 1;
  }
  return count;
}

function folderLabel(fileList: FileList | null): string {
  if (!fileList || fileList.length === 0) return "GLB 폴더 선택";
  const glbCount = countGlbFiles(fileList);
  const first = fileList[0];
  const rel = first.webkitRelativePath || first.name;
  const folder = rel.includes("/") ? rel.split("/")[0] : rel;
  return `${folder} (${glbCount}개 .glb)`;
}

export function BatchFolderPanel() {
  const [folderFiles, setFolderFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<BatchJobState | null>(null);
  const [originalUrls, setOriginalUrls] = useState<Map<string, string>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const revokeOriginalUrls = useCallback((urls: Map<string, string>) => {
    for (const url of urls.values()) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => revokeOriginalUrls(originalUrls), [originalUrls, revokeOriginalUrls]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const next = await fetchBatchJob(jobId);
          setJob(next);
          if (next.status === "done" || next.status === "error") {
            stopPolling();
            setBusy(false);
            if (next.status === "error") {
              setError(next.error ?? "처리 실패");
            }
          }
        } catch (err) {
          stopPolling();
          setBusy(false);
          setError(err instanceof Error ? err.message : "상태 조회 실패");
        }
      }, 2000);
    },
    [stopPolling],
  );

  const handleStart = useCallback(async () => {
    setError(null);
    setJob(null);
    setBusy(true);

    try {
      if (!folderFiles || countGlbFiles(folderFiles) === 0) {
        throw new Error(".glb 파일이 있는 폴더를 선택하세요");
      }
      const glbFiles = Array.from(folderFiles).filter((f) =>
        f.name.toLowerCase().endsWith(".glb"),
      );
      const nextOriginalUrls = new Map<string, string>();
      for (const file of glbFiles) {
        nextOriginalUrls.set(file.name, URL.createObjectURL(file));
      }
      setOriginalUrls((prev) => {
        revokeOriginalUrls(prev);
        return nextOriginalUrls;
      });
      const jobId = await startBatchFromUpload(glbFiles);

      const initial = await fetchBatchJob(jobId);
      setJob(initial);
      pollJob(jobId);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "시작 실패");
    }
  }, [folderFiles, pollJob, revokeOriginalUrls]);

  const canStart = !busy && countGlbFiles(folderFiles) > 0;

  const progress = job?.progress;
  const total = progress?.total ?? 0;
  const current = progress?.current ?? 0;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <section className="panel batch-folder-panel">
      <h2 className="batch-folder-title">여러 모델 자동 처리</h2>
      <p className="batch-folder-desc">
        여러 .glb를 한 번에 처리합니다. 각 모델마다 후보 품종을 만들고,
        4각도 스프라이트가 원본과 유사·주의 수준인 것만 남긴 뒤, 텍스처까지 시도해
        그중 용량이 가장 작은 결과를{" "}
        <code>output/&lt;실행시각&gt;/</code>에 저장합니다.
      </p>
      <ul className="batch-folder-notes">
        <li>모델마다 자동으로 품종 선별 (수동 비교 불필요)</li>
        <li>실패한 파일은 건너뛰고 다음 파일 계속 처리</li>
      </ul>

      <div className="batch-input-row">
        <label className="file-label batch-folder-label">
          <input
            type="file"
            accept=".glb"
            multiple
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            directory=""
            disabled={busy}
            onChange={(e) => setFolderFiles(e.target.files)}
          />
          {folderLabel(folderFiles)}
        </label>
        <p className="batch-folder-hint">
          폴더를 고르면 .glb만 서버로 업로드한 뒤 자동 처리합니다.
        </p>
      </div>

      <div className="batch-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canStart}
          onClick={handleStart}
        >
          {busy ? "처리 중…" : "시작"}
        </button>
      </div>

      {busy && progress && (
        <div className="sprite-export-progress">
          <div className="sprite-export-progress-bar">
            <div
              className="sprite-export-progress-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span>
            {current}/{total} 파일
            {progress.currentFile ? ` · ${progress.currentFile}` : ""}
            {progress.ok > 0 || progress.failed > 0
              ? ` · ok ${progress.ok} · 원본 ${progress.fallbackOriginal} · 실패 ${progress.failed}`
              : ""}
          </span>
        </div>
      )}

      {error && <p className="status error">{error}</p>}

      {job?.status === "done" && job.result && (
        <div className="batch-done">
          <p>
            완료 · {job.result.processed}개 처리 (ok {job.result.ok}, 원본 fallback{" "}
            {job.result.fallbackOriginal}, 실패 {job.result.failed})
          </p>
        </div>
      )}

      {job?.status === "done" && job.runId && job.result?.items?.length ? (
        <BatchResultReview
          runId={job.runId}
          items={job.result.items}
          originalUrls={originalUrls}
        />
      ) : null}
    </section>
  );
}
