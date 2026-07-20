import type { LayoutMode, SortMode, ViewSettings } from "./viewEntries";

interface ViewSettingsBarProps {
  settings: ViewSettings;
  onChange: (settings: ViewSettings) => void;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "triangles-asc", label: "트라이앵글 ↑" },
  { value: "triangles-desc", label: "트라이앵글 ↓" },
  { value: "fileSize-asc", label: "용량 ↑" },
  { value: "fileSize-desc", label: "용량 ↓" },
  { value: "reduction-desc", label: "감소율 ↓" },
  { value: "name-asc", label: "이름" },
  { value: "preset-group", label: "프리셋 그룹" },
];

const LAYOUT_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: "grid-2", label: "2열 그리드" },
  { value: "grid-3", label: "3열 그리드" },
  { value: "grid-4", label: "4열 그리드" },
  { value: "row", label: "한 줄" },
];

export function ViewSettingsBar({ settings, onChange }: ViewSettingsBarProps) {
  const patch = (partial: Partial<ViewSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="view-settings-bar">
      <label className="view-setting">
        <span>정렬</span>
        <select
          className="preset-select compact"
          value={settings.sortMode}
          onChange={(e) => patch({ sortMode: e.target.value as SortMode })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="view-setting">
        <span>페이지당</span>
        <select
          className="preset-select compact"
          value={settings.perPage}
          onChange={(e) =>
            patch({ perPage: Number(e.target.value) as ViewSettings["perPage"] })
          }
        >
          {[4, 6, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </label>

      <label className="view-setting">
        <span>배치</span>
        <select
          className="preset-select compact"
          value={settings.layout}
          onChange={(e) => patch({ layout: e.target.value as LayoutMode })}
        >
          {LAYOUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <span className="grid-hint view-settings-hint">
        배치 순서 = 최적화 순 · ← → 페이지 · 드래그 회전 · 스크롤 확대
      </span>
    </div>
  );
}
