import type { BatchResult, CultivarResult, RootOriginal } from "../types";
import { CultivarListItem } from "./CultivarListItem";
import { ViewerPanel } from "./ViewerPanel";
import { buildViewEntries } from "./viewEntries";

interface ComparisonViewerProps {
  rootOriginal: RootOriginal | null;
  batches: BatchResult[];
  activeId: string | null;
  selectedId: string | null;
  selectedCultivar: CultivarResult | null;
  onActiveChange: (id: string) => void;
  onSelectCultivar: (id: string) => void;
}

export function ComparisonViewer({
  rootOriginal,
  batches,
  activeId,
  selectedId,
  selectedCultivar,
  onActiveChange,
  onSelectCultivar,
}: ComparisonViewerProps) {
  const entries = buildViewEntries(rootOriginal, batches);

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        Upload a model and generate cultivars to start comparing.
      </div>
    );
  }

  const currentId = activeId ?? entries[0].id;
  const activeIndex = entries.findIndex((e) => e.id === currentId);
  const activeEntry = entries[activeIndex >= 0 ? activeIndex : 0];

  const goPrev = () => {
    const idx = activeIndex <= 0 ? entries.length - 1 : activeIndex - 1;
    onActiveChange(entries[idx].id);
  };

  const goNext = () => {
    const idx = activeIndex < 0 || activeIndex >= entries.length - 1 ? 0 : activeIndex + 1;
    onActiveChange(entries[idx].id);
  };

  const handleItemClick = (id: string, kind: "original" | "cultivar") => {
    onActiveChange(id);
    if (kind === "cultivar") {
      onSelectCultivar(id);
    }
  };

  return (
    <div className="comparison-split">
      <aside className="cultivar-sidebar">
        <div className="sidebar-header">
          <span>Models ({entries.length})</span>
          <span className="sidebar-hint">1 viewer</span>
        </div>
        <div className="sidebar-list">
          {entries.map((entry) => (
            <CultivarListItem
              key={entry.id}
              entry={entry}
              active={entry.id === currentId}
              selected={entry.kind === "cultivar" && entry.cultivar.id === selectedId}
              onClick={() =>
                handleItemClick(
                  entry.id,
                  entry.kind === "original" ? "original" : "cultivar",
                )
              }
            />
          ))}
        </div>
      </aside>

      <div className="viewer-column">
        <div className="viewer-nav">
          <button type="button" className="btn btn-secondary btn-sm" onClick={goPrev}>
            ← Prev
          </button>
          <span className="viewer-nav-label">
            {(activeIndex >= 0 ? activeIndex : 0) + 1} / {entries.length}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={goNext}>
            Next →
          </button>
        </div>
        <ViewerPanel entry={activeEntry} selectedCultivar={selectedCultivar} />
      </div>
    </div>
  );
}
