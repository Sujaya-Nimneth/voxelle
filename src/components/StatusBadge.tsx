'use client';

import StatusText from './design/StatusText';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
  provider?: string;
  model?: string;
  isDegraded?: boolean;
  degradedReason?: string | null;
}

function providerLabel(provider: string): string {
  if (provider === 'mock') return 'Demo mode';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Neutral status + a quiet provider line. No coloured pill per state. */
export default function StatusBadge({
  status,
  provider,
  model,
  isDegraded,
  degradedReason,
}: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      {provider && (
        <span
          className="hidden md:inline-block text-[11px] text-faint max-w-[220px] truncate"
          title={
            isDegraded
              ? `Fell back to demo mode${degradedReason ? `: ${degradedReason}` : ''}`
              : `AI provider: ${provider}${model ? ` (${model})` : ''}`
          }
        >
          {providerLabel(provider)}
          {isDegraded ? ' · fallback' : ''}
        </span>
      )}
      <StatusText status={status} />
    </div>
  );
}
