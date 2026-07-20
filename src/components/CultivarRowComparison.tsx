import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BatchResult, CultivarResult, RootOriginal, SpriteCompareResponse } from "../types";
import { indexSpriteResults } from "../utils/spriteMetrics";
import { SpriteAnalysisPanel } from "./SpriteAnalysisPanel";
import { CultivarDetailPanel } from "./CultivarDetailPanel";
import { CultivarListItem } from "./CultivarListItem";
import { MultiModelGrid } from "./MultiModelGrid";
import { ViewSettingsBar } from "./ViewSettingsBar";
import {
  buildComparisonEntries,
  buildGridEntries,
  buildViewEntries,
  DEFAULT_VIEW_SETTINGS,
  sortEntries,
  type ViewSettings,
} from "./viewEntries";

interface CultivarRowComparisonProps {
  workspaceId: string | null;
  rootOriginal: RootOriginal | null;
  batches: BatchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  cultivars: CultivarResult[];
}

export function CultivarRowComparison({
  rootOriginal,
  batches,
  selectedId,
  onSelect,
  cultivars,
}: CultivarRowComparisonProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [viewSettings, setViewSettings] = useState<ViewSettings>(DEFAULT_VIEW_SETTINGS);
  const [pageIndex, setPageIndex] = useState(0);
  const [spriteResults, setSpriteResults] = useState<SpriteCompareResponse | null>(null);
  const [viewerSuspended, setViewerSuspended] = useState(false);
  const [viewerEpoch, setViewerEpoch] = useState(0);

  const handleViewerSuspend = useCallback((suspended: boolean) => {
    setViewerSuspended((prev) => {
      if (prev && !suspended) {
        setViewerEpoch((epoch) => epoch + 1);
      }
      return suspended;
    });
  }, []);

  const spriteById = useMemo(
    () => (spriteResults ? indexSpriteResults(spriteResults.entries) : null),
    [spriteResults],
  );

  const comparisonEntries = useMemo(
    () => buildComparisonEntries(rootOriginal, batches, viewSettings.sortMode),
    [rootOriginal, batches, viewSettings.sortMode],
  );

  const entries = useMemo(
    () => sortEntries(buildViewEntries(rootOriginal, batches), viewSettings.sortMode),
    [rootOriginal, batches, viewSettings.sortMode],
  );

  const gridEntries = useMemo(
    () => sortEntries(buildGridEntries(batches), viewSettings.sortMode),
    [batches, viewSettings.sortMode],
  );

  const pageCount = Math.max(1, Math.ceil(gridEntries.length / viewSettings.perPage));

  const selectedRank =
    selectedId && entries.some((e) => e.id === selectedId)
      ? entries.findIndex((e) => e.id === selectedId) + 1
      : null;

  useEffect(() => {
    setPageIndex(0);
    setSpriteResults(null);
  }, [viewSettings.sortMode, viewSettings.perPage, viewSettings.layout, gridEntries.length]);

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageIndex, pageCount]);

  useEffect(() => {
    if (entries.length > 0 && !selectedId) {
      onSelect(entries[0].id);
    }
  }, [entries, selectedId, onSelect]);

  useEffect(() => {
    if (!selectedId || gridEntries.length === 0) return;
    const idx = gridEntries.findIndex((e) => e.id === selectedId);
    if (idx >= 0) {
      setPageIndex(Math.floor(idx / viewSettings.perPage));
    }
  }, [selectedId, gridEntries, viewSettings.perPage]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-entry-id="${selectedId}"]`);
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        Upload a model and generate cultivars to start comparing.
      </div>
    );
  }

  const cultivarSelectedId =
    selectedId && selectedId !== "original" ? selectedId : null;

  const sortLabel =
    viewSettings.sortMode === "triangles-asc"
      ? "트라이앵글 순"
      : viewSettings.sortMode === "triangles-desc"
        ? "트라이앵글 역순"
        : "사용자 정렬";

  return (
    <div className="comparison-split">
      <aside className="cultivar-sidebar">
        <div className="sidebar-header">
          <span>품종 목록 ({entries.length})</span>
          <span className="sidebar-hint">{sortLabel}</span>
        </div>
        <div className="sidebar-list" ref={listRef}>
          {entries.map((entry, index) => (
            <div key={entry.id} data-entry-id={entry.id}>
              <CultivarListItem
                entry={entry}
                rank={index + 1}
                active={entry.id === selectedId}
                selected={
                  entry.kind === "cultivar" &&
                  entry.cultivar.id === cultivarSelectedId
                }
                sprite={spriteById?.get(entry.id)}
                spriteBatch={spriteResults?.entries}
                onClick={() => onSelect(entry.id)}
              />
            </div>
          ))}
        </div>
      </aside>

      <div className="viewer-column">
        <ViewSettingsBar settings={viewSettings} onChange={setViewSettings} />
        <SpriteAnalysisPanel
          rootUrl={rootOriginal?.previewUrl ?? null}
          entries={comparisonEntries}
          onSpriteResults={setSpriteResults}
          onViewerSuspend={handleViewerSuspend}
        />
        <MultiModelGrid
          key={viewerEpoch}
          entries={gridEntries}
          rootOriginal={rootOriginal}
          selectedId={selectedId}
          onSelect={onSelect}
          pageIndex={pageIndex}
          onPageChange={setPageIndex}
          perPage={viewSettings.perPage}
          layout={viewSettings.layout}
          suspended={viewerSuspended}
        />
        <CultivarDetailPanel
          selectedId={selectedId}
          rootOriginal={rootOriginal}
          cultivars={cultivars}
          rank={selectedRank}
        />
      </div>
    </div>
  );
}
