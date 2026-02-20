import React from 'react';

interface TagProps {
  label: string;
}

export default function Tag({ label }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {label}
    </span>
  );
}
