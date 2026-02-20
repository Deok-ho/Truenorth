import React from 'react';
import { HelpCircle } from 'lucide-react';

interface PredictedQuestionsCardProps {
  questions: string[];
}

export default function PredictedQuestionsCard({ questions }: PredictedQuestionsCardProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="rounded-xl bg-amber-50/60 p-4 shadow-sm ring-1 ring-amber-200/60">
      <div className="mb-3 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-800">결재자 예상 질문</h3>
      </div>
      <ul className="space-y-2">
        {questions.map((q, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-lg bg-white/70 px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">
              {i + 1}
            </span>
            <p className="text-xs leading-relaxed text-slate-700">{q}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
