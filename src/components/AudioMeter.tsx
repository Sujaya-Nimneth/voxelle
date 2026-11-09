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

// Leaf component: the only per-frame subscriber to the audio-levels store.
// Levels drive composited scaleY transforms, never layout-triggering writes.
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
    <div className="h-[44px] flex items-end justify-between gap-[3px]" role="img" aria-label="Microphone frequency levels">
      {BAR_BASE_HEIGHTS.map((baseH, idx) => {
        let scale = baseH / MAX_BAR_HEIGHT;

        if (isListening) {
          scale = Math.max(MIN_SCALE, Math.min(1, levels[idx] ?? 0.12));
        } else if (isSpeaking) {
          scale = Math.max(8 / MAX_BAR_HEIGHT, ((baseH * (1 + ((idx % 3) * 0.4))) % 40) / MAX_BAR_HEIGHT);
        } else if (isProcessing) {
          scale = Math.max(8 / MAX_BAR_HEIGHT, (baseH * 0.8) / MAX_BAR_HEIGHT);
        }

        return (
          <span
            key={idx}
            className="w-[3px] h-[42px] rounded-full transition-transform duration-100 ease-out origin-bottom"
            style={{
              transform: `scaleY(${scale})`,
              background: 'var(--accent)',
              opacity: isActive ? 0.9 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}
