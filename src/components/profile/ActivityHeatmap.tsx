import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fetchResultsForDay } from '../../services/results.service';
import type { ActivityDay, StoredResult } from '../../types/auth';

// 🆕 Feature 7 — GitHub-style contribution calendar. Renders the last `days`
// days as a grid of week-columns x 7 day-rows. Color intensity is computed
// inline (rgb(var(--accent-primary) / opacity)) rather than via dynamically-
// built Tailwind class names, since Tailwind's JIT scanner can't see class
// names assembled at runtime (e.g. `bg-accent-primary/${n}`) — only classes
// that appear as literal strings in source get generated.

interface ActivityHeatmapProps {
  userId: string;
  data: ActivityDay[];
  days?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ userId, data, days = 365 }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayResults, setDayResults] = useState<StoredResult[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const countByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.day, d.count);
    return m;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(1, ...data.map(d => d.count)),
    [data],
  );

  // Build a full grid, aligned so the first column starts on a Sunday and
  // the grid ends today, matching the classic contribution-calendar layout.
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (days - 1) * DAY_MS);
    // Rewind to the previous Sunday so week columns align cleanly.
    const alignedStart = new Date(start.getTime() - start.getDay() * DAY_MS);

    const cols: { date: Date; key: string; count: number }[][] = [];
    let cursor = new Date(alignedStart);
    let col: { date: Date; key: string; count: number }[] = [];

    while (cursor <= today) {
      const key = toDayKey(cursor);
      col.push({ date: new Date(cursor), key, count: countByDay.get(key) ?? 0 });
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
    if (col.length > 0) cols.push(col);
    return cols;
  }, [countByDay, days]);

  const levelOpacity = (count: number): number => {
    if (count === 0) return 0;
    const ratio = Math.min(1, count / maxCount);
    // Floors at 0.25 so any nonzero day is still clearly visible.
    return 0.25 + ratio * 0.75;
  };

  const handleClickDay = async (key: string, count: number) => {
    if (count === 0) return;
    setSelectedDay(key);
    setLoadingDay(true);
    try {
      const results = await fetchResultsForDay(userId, key);
      setDayResults(results);
    } catch {
      setDayResults([]);
    } finally {
      setLoadingDay(false);
    }
  };

  const monthLabels = useMemo(() => {
    const labels: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((col, i) => {
      const firstOfCol = col[0]?.date;
      if (!firstOfCol) return;
      const m = firstOfCol.getMonth();
      if (m !== lastMonth) {
        labels.push({ colIndex: i, label: firstOfCol.toLocaleDateString(undefined, { month: 'short' }) });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  // Default scroll position: rightmost column (most recent days), matching
  // GitHub's contribution calendar behavior.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Month labels */}
          <div className="flex gap-[3px] pl-6 text-[10px] text-text-muted font-mono">
            {weeks.map((_, i) => {
              const label = monthLabels.find(l => l.colIndex === i)?.label;
              return (
                <div key={i} className="w-[11px] shrink-0">
                  {label ?? ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map(cell => (
                  <button
                    key={cell.key}
                    onClick={() => handleClickDay(cell.key, cell.count)}
                    title={`${cell.key}: ${cell.count} test${cell.count === 1 ? '' : 's'}`}
                    disabled={cell.count === 0}
                    className="w-[11px] h-[11px] rounded-[2px] transition-transform hover:scale-125 disabled:cursor-default disabled:hover:scale-100"
                    style={{
                      backgroundColor: cell.count === 0
                        ? 'rgb(var(--bg-tertiary))'
                        : `rgb(var(--accent-primary) / ${levelOpacity(cell.count)})`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day detail popover */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedDay(null); }}
        >
          <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-5 w-full max-w-sm max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono font-semibold text-sm text-text-primary">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
                })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            {loadingDay ? (
              <p className="text-xs text-text-muted">Loading…</p>
            ) : dayResults.length === 0 ? (
              <p className="text-xs text-text-muted">No tests found for this day.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dayResults.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs bg-bg-primary/40 rounded-lg px-3 py-2">
                    <span className="text-text-muted font-mono">
                      {new Date(r.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-accent-primary font-mono font-bold">{Number(r.wpm).toFixed(0)} wpm</span>
                    <span className="text-text-muted font-mono">{Number(r.accuracy).toFixed(0)}% acc</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
