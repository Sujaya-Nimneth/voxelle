'use client';

import { motion } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
  provider?: string;
  model?: string;
  isDegraded?: boolean;
  degradedReason?: string | null;
}

const statusConfig: Record<
  AssistantStatus,
  { label: string; dotColor: string; textColor: string; borderColor: string; bgColor: string }
> = {
  idle: {
    label: 'Ready',
    dotColor: 'var(--green)',
    textColor: '#a5e8bf',
    borderColor: 'rgba(74, 222, 128, 0.22)',
    bgColor: 'rgba(74, 222, 128, 0.07)',
  },
  listening: {
    label: 'Listening',
    dotColor: 'var(--cyan)',
    textColor: '#a9edf8',
    borderColor: 'rgba(34, 211, 238, 0.32)',
    bgColor: 'rgba(34, 211, 238, 0.08)',
  },
  processing: {
    label: 'Thinking',
    dotColor: 'var(--cyan)',
    textColor: '#a9edf8',
    borderColor: 'rgba(34, 211, 238, 0.32)',
    bgColor: 'rgba(34, 211, 238, 0.08)',
  },
  speaking: {
    label: 'Speaking',
    dotColor: 'var(--violet)',
    textColor: '#d4ccff',
    borderColor: 'rgba(139, 124, 246, 0.32)',
    bgColor: 'rgba(139, 124, 246, 0.08)',
  },
};

function providerLabel(provider: string, model?: string): string {
  if (provider === 'mock') return 'Demo mode';
  const name = provider.charAt(0).toUpperCase() + provider.slice(1);
  return model ? `${name} · ${model}` : name;
}

export default function StatusBadge({
  status,
  provider,
  model,
  isDegraded,
  degradedReason,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {provider && (
        <span
          className={`hidden md:inline-block font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border max-w-[220px] truncate ${
            isDegraded
              ? 'border-warning/40 text-warning bg-warning/5'
              : 'border-white/10 text-dim bg-white/[0.02]'
          }`}
          title={
            isDegraded
              ? `Fell back to demo mode${degradedReason ? `: ${degradedReason}` : ''}`
              : `AI provider: ${provider}${model ? ` (${model})` : ''}`
          }
        >
          {providerLabel(provider, model)}
          {isDegraded ? ' · fallback' : ''}
        </span>
      )}

      <div
        className="flex items-center gap-2 py-1.5 px-2.5 rounded-full font-mono text-[10px] font-medium tracking-[0.06em] transition-colors"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderWidth: 1,
          borderStyle: 'solid',
          color: config.textColor,
        }}
      >
        <motion.i
          className="w-1.5 h-1.5 rounded-full not-italic block"
          style={{
            backgroundColor: config.dotColor,
            boxShadow: `0 0 8px ${config.dotColor}`,
          }}
          animate={
            status !== 'idle'
              ? {
                  scale: [1, 1.4, 1],
                  opacity: [0.7, 1, 0.7],
                }
              : { scale: 1, opacity: 1 }
          }
          transition={
            status !== 'idle'
              ? { duration: 1, repeat: Infinity }
              : { duration: 0.3 }
          }
        />
        <span>{config.label}</span>
      </div>
    </div>
  );
}
