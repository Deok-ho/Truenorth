import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'card';
}

export default function Skeleton({
  width,
  height,
  variant = 'text',
}: SkeletonProps) {
  const baseClass = 'skeleton-shimmer';

  if (variant === 'circle') {
    const size = width || height || 40;
    return (
      <div
        className={`${baseClass} shrink-0 rounded-full`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className={`${baseClass} h-10 w-10 shrink-0 rounded-full`} />
          <div className="flex w-full flex-col gap-2">
            <div className={`${baseClass} h-4 w-3/4 rounded`} />
            <div className={`${baseClass} h-3 w-1/2 rounded`} />
          </div>
        </div>
        <div className="space-y-2">
          <div className={`${baseClass} h-3 w-full rounded`} />
          <div className={`${baseClass} h-3 w-full rounded`} />
          <div className={`${baseClass} h-3 w-5/6 rounded`} />
        </div>
      </div>
    );
  }

  // text variant
  return (
    <div
      className={`${baseClass} rounded`}
      style={{
        width: width || '100%',
        height: height || 16,
      }}
    />
  );
}
