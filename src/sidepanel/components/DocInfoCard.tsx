import React from 'react';
import Badge from './Badge';

interface DocInfoCardProps {
  doc_type: string;
  subject: string;
  requester_name: string;
  requester_dept: string;
  created_at: string;
}

export default function DocInfoCard({
  doc_type,
  subject,
  requester_name,
  requester_dept,
  created_at,
}: DocInfoCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-3 flex items-start justify-between">
        <Badge label={doc_type} variant="doctype" />
      </div>
      <h2 className="mb-2 text-lg font-bold leading-tight text-slate-900">
        {subject}
      </h2>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium">
          {requester_dept} {requester_name}
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{created_at}</span>
      </div>
    </div>
  );
}
