'use client';

import { useSyncExternalStore } from 'react';
import { audioLevelsStore } from '@/lib/audioLevels';
import type { AssistantStatus } from '@/types/types';

const BAR_BASE_HEIGHTS = [11, 21, 31, 16, 39, 25, 17, 29, 12, 20, 9];
const MAX_BAR_HEIGHT = 42;
const MIN_SCALE = 6 / MAX_BAR_HEIGHT;

interface AudioMeterProps {
  status: AssistantStatus;
}

// Leaf component: the only subscriber to the audio-levels external store.
// Per-frame level updates re-render just these bars, animating with
// composited scaleY transforms instead of layout-triggering height writes.
export default function AudioMeter({ status }: AudioMeterProps) {
  const levels = useSyncExternalStore(
    audioLevelsStore.subscribe,
    audioLevelsStore.getSnapshot,
    audioLevelsStore.getServerSnapshot
  );

  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isProcessing = status === 'processing';
  const isActive = isListening || isSpeaking || isProcessing;

  return (
    <div className="h-[44px] flex items-end justify-between gap-[4px] px-1 pb-1">
      {BAR_BASE_HEIGHTS.map((baseH, idx) => {
        // Real frequency level if microphone is live; otherwise responsive ambient wave
        let scale = baseH / MAX_BAR_HEIGHT;

        if (isListening) {
          scale = Math.max(MIN_SCALE, Math.min(1, levels[idx] ?? 0.12));
        } else if (isSpeaking) {
          scale = Math.max(8 / MAX_BAR_HEIGHT, ((baseH * (1 + ((idx % 3) * 0.4))) % 40) / MAX_BAR_HEIGHT);
        } else if (isProcessing) {
          scale = Math.max(8 / MAX_BAR_HEIGHT, (baseH * 0.8) / MAX_BAR_HEIGHT);
        }

        return (
          <div
            key={idx}
            className="w-[5px] h-[42px] rounded-full transition-transform duration-100 ease-out origin-bottom"
            style={{
              transform: `scaleY(${scale})`,
              background: 'linear-gradient(to top, var(--violet), var(--cyan))',
              opacity: isActive ? 0.95 : 0.5,
              boxShadow: isActive ? '0 0 8px rgba(53, 230, 255, 0.3)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
