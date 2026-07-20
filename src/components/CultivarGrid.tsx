import type { BatchResult, RootOriginal } from "../types";
import { CultivarCard } from "./CultivarCard";
import { OriginalCard } from "./OriginalCard";

interface CultivarGridProps {
  rootOriginal: RootOriginal | null;
  batches: BatchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CultivarGrid({
  rootOriginal,
  batches,
  selectedId,
  onSelect,
}: CultivarGridProps) {
  if (!rootOriginal && batches.length === 0) {
    return (
      <div className="empty-state">
        Upload a model and generate cultivars to start comparing.
      </div>
    );
  }

  return (
    <div className="comparison-layout">
      {rootOriginal && (
        <section className="batch-section">
          <h3 className="batch-title">원본</h3>
          <div className="cultivar-grid">
            <OriginalCard original={rootOriginal} />
          </div>
        </section>
      )}

      {batches.map((batch) => (
        <section key={batch.id} className="batch-section">
          <h3 className="batch-title">
            {batch.label}
            {batch.sourceName && (
              <span className="batch-source"> · from {batch.sourceName}</span>
            )}
            <span className="batch-count">{batch.cultivars.length} variants</span>
          </h3>
          <div className="cultivar-grid">
            {batch.cultivars.map((cultivar) => (
              <CultivarCard
                key={cultivar.id}
                cultivar={cultivar}
                selected={cultivar.id === selectedId}
                onSelect={() => onSelect(cultivar.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
