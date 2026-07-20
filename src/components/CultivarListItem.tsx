import type { SpriteEntryResult } from "../types";
import type { ViewEntry } from "./viewEntries";
import { formatEntrySubtitle } from "./viewEntries";
import {
  formatSpriteScore,
  getBatchRank,
  getSpriteVerdict,
  getSpriteVerdictLabel,
} from "../utils/spriteMetrics";

interface CultivarListItemProps {
  entry: ViewEntry;
  rank?: number;
  active: boolean;
  selected: boolean;
  sprite?: SpriteEntryResult;
  spriteBatch?: readonly SpriteEntryResult[];
  onClick: () => void;
}

export function CultivarListItem({
  entry,
  rank,
  active,
  selected,
  sprite,
  spriteBatch,
  onClick,
}: CultivarListItemProps) {
  const isOriginal = entry.kind === "original";
  const title = isOriginal ? "원본 (Original)" : entry.cultivar.name;
  const subtitle = formatEntrySubtitle(entry);
  const group =
    entry.kind === "cultivar" ? entry.cultivar.presetGroupLabel : "Reference";
  const spriteVerdict = sprite ? getSpriteVerdict(sprite, spriteBatch) : null;

  return (
    <button
      type="button"
      className={`list-item ${active ? "active" : ""} ${selected ? "selected" : ""} ${isOriginal ? "original" : ""}`}
      onClick={onClick}
    >
      <div className="list-item-top">
        <span className="list-item-title">
          {rank != null && <span className="list-item-rank">#{rank} </span>}
          {title}
        </span>
        {selected && !isOriginal && (
          <span className="list-item-badge">Selected</span>
        )}
        {spriteVerdict && sprite && (
          <span className={`sprite-badge sprite-badge-${spriteVerdict}`}>
            {getSpriteVerdictLabel(spriteVerdict)}
            {spriteBatch && ` #${getBatchRank(sprite, spriteBatch)}`}{" "}
            {formatSpriteScore(sprite.maxDiff)}
          </span>
        )}
      </div>
      <div className="list-item-sub">{subtitle}</div>
      {!isOriginal && (
        <div className="list-item-group">{group}</div>
      )}
    </button>
  );
}
