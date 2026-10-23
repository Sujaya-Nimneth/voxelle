'use client';

import { motion } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
  provider?: string;
  isDegraded?: boolean;
}

const statusConfig: Record<
  AssistantStatus,
  { label: string; dotColor: string; textColor: string; borderColor: string; bgColor: string }
> = {
  idle: {
    label: 'SYSTEM READY',
    dotColor: 'var(--lime)',
    textColor: '#c7ed9d',
    borderColor: 'rgba(181, 245, 111, 0.19)',
    bgColor: 'rgba(181, 245, 111, 0.06)',
  },
  listening: {
    label: 'LISTENING',
    dotColor: 'var(--cyan)',
    textColor: '#c9faff',
    borderColor: 'rgba(53, 230, 255, 0.35)',
    bgColor: 'rgba(53, 230, 255, 0.08)',
  },
  processing: {
    label: 'THINKING',
    dotColor: 'var(--violet)',
    textColor: '#e4d6ff',
    borderColor: 'rgba(146, 108, 255, 0.35)',
    bgColor: 'rgba(146, 108, 255, 0.08)',
  },
  speaking: {
    label: 'SPEAKING',
    dotColor: 'var(--violet)',
    textColor: '#e4d6ff',
    borderColor: 'rgba(146, 108, 255, 0.35)',
    bgColor: 'rgba(146, 108, 255, 0.08)',
  },
};

export default function StatusBadge({ status, provider, isDegraded }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {provider && provider !== 'mock' && (
        <span className="hidden md:inline-block font-mono text-[9px] uppercase px-2 py-0.5 rounded-full border border-white/10 text-muted bg-white/[0.02]">
          {isDegraded ? `${provider} (fallback)` : provider}
        </span>
      )}

      <div
        className="flex items-center gap-[8px] py-[6px] px-[10px] rounded-[20px] font-mono text-[10px] font-medium tracking-[0.7px] transition-colors"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderWidth: 1,
          borderStyle: 'solid',
          color: config.textColor,
        }}
      >
        <motion.i
          className="w-[6px] h-[6px] rounded-full not-italic block"
          style={{
            backgroundColor: config.dotColor,
            boxShadow: `0 0 9px ${config.dotColor}`,
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
