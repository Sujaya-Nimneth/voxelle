'use client';

import { motion } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
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

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <motion.div
      layout
      className="flex items-center gap-[9px] py-[8px] px-[11px] rounded-[20px] font-mono text-[10px] font-medium tracking-[0.7px] transition-colors"
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
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
    </motion.div>
  );
}
