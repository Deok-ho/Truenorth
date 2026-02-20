import React from 'react';
import { Lightbulb } from 'lucide-react';

interface AIInsightCardProps {
  title: string;
  content: string;
}

export default function AIInsightCard({ title, content }: AIInsightCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-600/20 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-[10%] -top-[50%] h-20 w-20 rounded-full bg-brand-600/10 blur-2xl" />

      <div className="flex gap-3">
        <div className="shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/10 text-brand-600">
            <Lightbulb className="h-[18px] w-[18px]" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="text-xs leading-relaxed text-slate-600">{content}</p>
        </div>
      </div>
    </div>
  );
}
