import React, { useMemo } from 'react';
import type { CoherenceCheck } from '@shared/types';

interface CoherenceRadarProps {
  checks: CoherenceCheck[];
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 80;
const LEVELS = 4; // 25%, 50%, 75%, 100%

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

export default function CoherenceRadar({ checks }: CoherenceRadarProps) {
  const { axesData, pointsData, polygonStr } = useMemo(() => {
    if (!checks || checks.length === 0) {
      return { axesData: [], pointsData: [], polygonStr: '' };
    }

    // Derive axes dynamically from the actual checks (adaptive criteria)
    const count = checks.length;
    const angleStep = 360 / count;

    const axes = checks.map((check, i) => {
      // Normalize: (score / weight) * 100, clamped 0-100
      const pct = check.weight > 0
        ? Math.round(Math.min((check.score / check.weight) * 100, 100))
        : 0;
      const angle = i * angleStep;
      const end = polarToCartesian(angle, RADIUS);
      const labelPos = polarToCartesian(angle, RADIUS + 20);
      return { label: check.item, pct, angle, end, labelPos };
    });

    const points = axes.map((a) => {
      const r = (a.pct / 100) * RADIUS;
      return polarToCartesian(a.angle, r);
    });

    const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

    return { axesData: axes, pointsData: points, polygonStr: polygon };
  }, [checks]);

  if (axesData.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold text-slate-700">정합성 레이더</h4>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block"
        role="img"
        aria-label="정합성 레이더 차트"
      >
        {/* Background rings */}
        {Array.from({ length: LEVELS }, (_, i) => {
          const r = ((i + 1) / LEVELS) * RADIUS;
          const ringPoints = Array.from({ length: axesData.length }, (_, j) => {
            const angle = j * (360 / axesData.length);
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
        {axesData.map((axis, i) => (
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
          points={polygonStr}
          fill="rgba(99, 102, 241, 0.20)"
          stroke="#4f46e5"
          strokeWidth={2}
        />

        {/* Data points */}
        {pointsData.map((p, i) => (
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
        {axesData.map((axis, i) => (
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
            {axis.label}
          </text>
        ))}

        {/* Score labels on data points */}
        {axesData.map((axis, i) => {
          const p = pointsData[i];
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
              {axis.pct}%
            </text>
          );
        })}
      </svg>
    </div>
  );
}
