import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'lg';
}

function getColor(score: number): string {
  if (score >= 80) return '#10B981'; // emerald-500
  if (score >= 60) return '#F59E0B'; // amber-500
  return '#F43F5E'; // rose-500
}

function getLabel(score: number): string {
  if (score >= 80) return '양호';
  if (score >= 60) return '보통';
  return '미흡';
}

export default function ScoreGauge({ score, size = 'lg' }: ScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const dimension = size === 'lg' ? 120 : 64;
  const radius = size === 'lg' ? 42 : 24;
  const strokeWidth = size === 'lg' ? 8 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = getColor(clampedScore);
  const viewBox = size === 'lg' ? '0 0 100 100' : '0 0 56 56';
  const center = size === 'lg' ? 50 : 28;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dimension, height: dimension }}
    >
      <svg
        className="-rotate-90"
        width={dimension}
        height={dimension}
        viewBox={viewBox}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}
          style={{ color }}
        >
          {clampedScore}%
        </span>
        {size === 'lg' && (
          <span className="mt-0.5 text-[11px] font-medium text-slate-400">
            {getLabel(clampedScore)}
          </span>
        )}
      </div>
    </div>
  );
}
