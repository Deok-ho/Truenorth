import React from 'react';
import { AlertTriangle, WifiOff, KeyRound, FileWarning, Clock, FileSearch } from 'lucide-react';

type ErrorType = 'network' | 'api_key' | 'parse' | 'rate_limit' | 'no_document';

interface ErrorStateProps {
  type: ErrorType;
  message: string;
  onRetry: () => void;
}

const errorConfig: Record<
  ErrorType,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  network: {
    icon: <WifiOff className="h-10 w-10" />,
    title: '네트워크 연결 실패',
    description: 'API 연결에 문제가 발생했습니다.\n네트워크를 확인하고 다시 시도해주세요.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  api_key: {
    icon: <KeyRound className="h-10 w-10" />,
    title: 'API 키 오류',
    description: 'API 키가 유효하지 않습니다.\n설정에서 올바른 API 키를 입력해주세요.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
  parse: {
    icon: <FileWarning className="h-10 w-10" />,
    title: '문서 파싱 실패',
    description: '문서를 분석할 수 없습니다.\n지원되는 그룹웨어 페이지인지 확인해주세요.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  rate_limit: {
    icon: <Clock className="h-10 w-10" />,
    title: '요청 한도 초과',
    description: 'API 요청 한도에 도달했습니다.\n잠시 후 다시 시도해주세요.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  no_document: {
    icon: <FileSearch className="h-10 w-10" />,
    title: '문서를 찾을 수 없음',
    description: '결재 문서가 감지되지 않았습니다.\n그룹웨어 결재 페이지를 열고 다시 시도해주세요.',
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-400',
  },
};

export default function ErrorState({ type, message, onRetry }: ErrorStateProps) {
  const config = errorConfig[type] || errorConfig.network;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      {/* Icon */}
      <div className="group relative mb-6">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ring-1 ${config.iconBg} ${config.iconColor} ring-slate-100`}
        >
          {config.icon}
        </div>
      </div>

      {/* Text */}
      <div className="mb-8 space-y-3">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          {config.title}
        </h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-500">
          {message || config.description}
        </p>
      </div>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
      >
        다시 시도
      </button>

      {/* Help link */}
      <button className="mt-4 text-xs font-medium text-slate-400 transition-colors hover:text-brand-600">
        문제 신고하기
      </button>
    </div>
  );
}
