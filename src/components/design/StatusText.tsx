'use client';

import type { AssistantStatus } from '@/types/types';

const LABELS: Record<AssistantStatus, string> = {
  idle: 'Ready',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
};

/**
 * Neutral, sentence-case status. The single small mark carries the accent;
 * no coloured pill per state, no pulsing dot farm.
 */
export default function StatusText({
  status,
  className = '',
}: {
  status: AssistantStatus;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-[12px] text-muted ${className}`} role="status">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: status === 'idle' ? 'var(--faint)' : 'var(--accent)' }}
        aria-hidden="true"
      />
      {LABELS[status]}
    </span>
  );
}
