import React from 'react';

interface ProgressBarProps {
  value: number;
}

function getColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function ProgressBar({ value }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${getColor(clampedValue)}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
