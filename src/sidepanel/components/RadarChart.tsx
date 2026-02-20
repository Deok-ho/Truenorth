import React, { useMemo } from 'react';
import type { HistoryEntry } from '@shared/types';

interface RadarChartProps {
  history: HistoryEntry[];
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 80;
const LEVELS = 4; // concentric rings (25%, 50%, 75%, 100%)

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  // Rotate -90° so first axis points up
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

export default function RadarChart({ history }: RadarChartProps) {
  const { axes, points, polygon } = useMemo(() => {
    // Aggregate average scores by docType
    const typeScores = new Map<string, { total: number; count: number }>();
    for (const entry of history) {
      if (entry.overallScore == null) continue;
      const key = entry.docType || '기타';
      const existing = typeScores.get(key) || { total: 0, count: 0 };
      existing.total += entry.overallScore;
      existing.count += 1;
      typeScores.set(key, existing);
    }

    const entries = [...typeScores.entries()]
      .map(([type, { total, count }]) => ({
        label: type,
        avg: Math.round(total / count),
      }))
      .sort((a, b) => b.avg - a.avg);

    if (entries.length < 3) {
      return { axes: [], points: [], polygon: '' };
    }

    const count = entries.length;
    const angleStep = 360 / count;

    const axesData = entries.map((e, i) => {
      const angle = i * angleStep;
      const end = polarToCartesian(angle, RADIUS);
      const labelPos = polarToCartesian(angle, RADIUS + 18);
      return { label: e.label, avg: e.avg, angle, end, labelPos };
    });

    const pointsData = entries.map((e, i) => {
      const angle = i * angleStep;
      const r = (e.avg / 100) * RADIUS;
      return polarToCartesian(angle, r);
    });

    const polygonStr = pointsData.map((p) => `${p.x},${p.y}`).join(' ');

    return { axes: axesData, points: pointsData, polygon: polygonStr };
  }, [history]);

  if (axes.length < 3) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold text-slate-700">문서 유형별 레이더</h4>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block"
        role="img"
        aria-label="문서 유형별 평균 점수 레이더 차트"
      >
        {/* Background rings */}
        {Array.from({ length: LEVELS }, (_, i) => {
          const r = ((i + 1) / LEVELS) * RADIUS;
          const n = axes.length;
          const ringPoints = Array.from({ length: n }, (_, j) => {
            const angle = j * (360 / n);
            const p = polarToCartesian(angle, r);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon
              key={i}
              points={ringPoints}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((axis, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={axis.end.x}
            y2={axis.end.y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygon}
          fill="rgba(99, 102, 241, 0.20)"
          stroke="#4f46e5"
          strokeWidth={2}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#4f46e5"
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* Axis labels */}
        {axes.map((axis, i) => (
          <text
            key={i}
            x={axis.labelPos.x}
            y={axis.labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontFamily="system-ui, sans-serif"
            className="fill-slate-600"
          >
            {axis.label.length > 6 ? axis.label.slice(0, 6) + '..' : axis.label}
          </text>
        ))}

        {/* Score labels on data points */}
        {axes.map((axis, i) => {
          const p = points[i];
          return (
            <text
              key={`score-${i}`}
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={8}
              fontWeight="bold"
              className="fill-indigo-600"
            >
              {axis.avg}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
