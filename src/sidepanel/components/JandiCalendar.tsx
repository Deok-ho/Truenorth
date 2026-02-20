import React, { useMemo, useRef, useEffect } from 'react';
import type { HistoryEntry } from '@shared/types';

interface JandiCalendarProps {
  history: HistoryEntry[];
}

const CELL_SIZE = 10;
const CELL_GAP = 2;
const WEEKS = 53;
const DAYS = 7;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getColor(count: number): string {
  if (count === 0) return '#f1f5f9'; // slate-100
  if (count === 1) return '#c7d2fe'; // indigo-200
  if (count <= 3) return '#818cf8'; // indigo-400
  return '#4f46e5';                  // indigo-600
}

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString) */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function JandiCalendar({ history }: JandiCalendarProps) {
  const { grid, monthLabels } = useMemo(() => {
    // Build a map of date → count (convert ISO timestamps to local date)
    const countMap = new Map<string, number>();
    for (const entry of history) {
      const dateStr = toLocalDateStr(new Date(entry.createdAt));
      countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
    }

    // Build 52-week grid ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Sunday of the week 51 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay() - (WEEKS - 1) * 7);

    const cells: Array<{ date: string; count: number; week: number; day: number }> = [];
    const months: Array<{ label: string; week: number }> = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const dateStr = toLocalDateStr(cursor);
        const count = countMap.get(dateStr) || 0;

        if (cursor <= today) {
          cells.push({ date: dateStr, count, week: w, day: d });
        }

        // Track month labels (first occurrence of each month in the grid)
        const month = cursor.getMonth();
        if (month !== lastMonth && d === 0) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          months.push({ label: monthNames[month], week: w });
          lastMonth = month;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return { grid: cells, monthLabels: months };
  }, [history]);

  // Auto-scroll to the right (most recent dates) on mount
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [grid]);

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28; // 28 for day labels
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 16; // 16 for month labels

  return (
    <div ref={scrollRef} className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold text-slate-700">활동 캘린더</h4>
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block"
        role="img"
        aria-label="분석 활동 캘린더"
      >
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text
            key={i}
            x={28 + m.week * (CELL_SIZE + CELL_GAP)}
            y={10}
            style={{ fill: '#94a3b8' }}
            fontSize={9}
            fontFamily="system-ui, sans-serif"
          >
            {m.label}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((label, i) => (
          label ? (
            <text
              key={i}
              x={0}
              y={16 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
              style={{ fill: '#94a3b8' }}
              fontSize={8}
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          ) : null
        ))}

        {/* Grid cells */}
        {grid.map((cell, i) => (
          <rect
            key={i}
            x={28 + cell.week * (CELL_SIZE + CELL_GAP)}
            y={16 + cell.day * (CELL_SIZE + CELL_GAP)}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            style={{ fill: getColor(cell.count) }}
          >
            <title>{`${cell.date}: ${cell.count}건 분석`}</title>
          </rect>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400">
        <span>Less</span>
        {[0, 1, 2, 4].map((count) => (
          <svg key={count} width={CELL_SIZE} height={CELL_SIZE}>
            <rect
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              style={{ fill: getColor(count) }}
            />
          </svg>
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
