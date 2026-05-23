'use client';

import { motion } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
}

const statusConfig: Record<
  AssistantStatus,
  { label: string; color: string; bgColor: string }
> = {
  idle: {
    label: 'Ready',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.15)',
  },
  listening: {
    label: 'Listening',
    color: '#00e5ff',
    bgColor: 'rgba(0, 229, 255, 0.12)',
  },
  processing: {
    label: 'Processing',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
  },
  speaking: {
    label: 'Speaking',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <motion.div
      layout
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ backgroundColor: config.bgColor }}
      animate={{ backgroundColor: config.bgColor }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
        animate={
          status !== 'idle'
            ? {
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7],
              }
            : { scale: 1, opacity: 0.7 }
        }
        transition={
          status !== 'idle'
            ? { duration: 1.2, repeat: Infinity }
            : { duration: 0.3 }
        }
      />
      <span
        className="text-[11px] font-mono uppercase tracking-wider font-medium"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </motion.div>
  );
}
