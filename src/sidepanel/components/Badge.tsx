import React from 'react';

type BadgeVariant = 'pass' | 'warn' | 'fail' | 'approved' | 'rejected' | 'doctype';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  pass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  warn: 'bg-amber-50 text-amber-600 ring-amber-100',
  fail: 'bg-rose-50 text-rose-600 ring-rose-100',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
  doctype: 'bg-brand-50 text-brand-600 ring-brand-600/20',
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
