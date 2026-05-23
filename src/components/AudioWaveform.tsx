'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';

interface AudioWaveformProps {
  status: AssistantStatus;
}

// Pre-computed random offsets for each bar (stable across renders)
const BAR_OFFSETS = [0.3, 0.7, 0.1, 0.9, 0.5, 0.2, 0.8];

export default function AudioWaveform({ status }: AudioWaveformProps) {
  const barCount = 7;
  const isActive = status === 'listening' || status === 'processing' || status === 'speaking';

  const getBarColor = () => {
    switch (status) {
      case 'listening':
        return '#00e5ff';
      case 'processing':
        return '#a855f7';
      case 'speaking':
        return '#a855f7';
      default:
        return '#334155';
    }
  };

  const barAnimations = useMemo(() => {
    return BAR_OFFSETS.map((offset) => ({
      scaleY: [1, 1.8 + offset * 1.2, 0.6, 1.4 + offset, 1],
      opacity: [0.6, 1, 0.7, 1, 0.6],
    }));
  }, []);

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full origin-center"
          style={{ backgroundColor: getBarColor() }}
          animate={
            isActive
              ? barAnimations[i]
              : {
                  scaleY: 1,
                  opacity: 0.3,
                }
          }
          transition={
            isActive
              ? {
                  duration: status === 'processing' ? 0.6 : 0.8,
                  repeat: Infinity,
                  repeatType: 'mirror' as const,
                  delay: i * 0.08,
                  ease: 'easeInOut',
                }
              : {
                  duration: 0.4,
                }
          }
          initial={{ height: 16, scaleY: 1 }}
        />
      ))}
    </div>
  );
}
