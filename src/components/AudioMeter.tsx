'use client';

import { useSyncExternalStore } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { audioLevelsStore } from '@/lib/audioLevels';
import type { AssistantStatus } from '@/types/types';

interface AudioMeterProps {
  status: AssistantStatus;
  compact?: boolean;
}

const DEFAULT_IDLE = [
  0.14, 0.2, 0.28, 0.36, 0.44, 0.52, 0.52, 0.44, 0.36, 0.28, 0.2, 0.14,
];

const SPEAKING_PROFILE = [
  0.3, 0.48, 0.65, 0.82, 0.72, 0.92, 0.88, 0.68, 0.78, 0.56, 0.42, 0.28,
];

/**
 * 12-band SVG telemetry meter for the activity drawer/sheet.
 * Uses `useSyncExternalStore` directly on `audioLevelsStore` so DSP frames
 * never propagate React state updates up to the conversation workspace.
 */
export default function AudioMeter({ status, compact = false }: AudioMeterProps) {
  const levels = useSyncExternalStore(
    audioLevelsStore.subscribe,
    audioLevelsStore.getSnapshot,
    audioLevelsStore.getServerSnapshot
  );

  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isProcessing = status === 'processing';

  const activeColor =
    isListening || isSpeaking
      ? 'var(--color-accent)'
      : isProcessing
        ? 'var(--color-warning)'
        : 'var(--color-border-emphasized)';

  const heightPx = compact ? 36 : 56;
  const bands = levels.map((lvl, idx) => {
    if (isListening) return Math.max(0.14, Math.min(1, lvl));
    if (isSpeaking) return SPEAKING_PROFILE[idx] ?? 0.5;
    if (isProcessing) return 0.24 + ((idx % 3) * 0.14);
    return DEFAULT_IDLE[idx] ?? 0.2;
  });

  const peakDb = isListening
    ? Math.round(Math.max(...bands) * 100)
    : isSpeaking
      ? 78
      : isProcessing
        ? 40
        : 0;

  return (
    <Card elevation="low" padding={compact ? 2 : 3}>
      <VStack gap={2}>
        <HStack justify="between" align="center">
          <Text type="label" color="secondary">
            Audio telemetry
          </Text>
          <Text type="code" color={isListening || isSpeaking ? 'accent' : 'secondary'} hasTabularNumbers>
            {isListening ? `MIC ${peakDb}%` : isSpeaking ? 'TTS ACTIVE' : isProcessing ? 'STREAMING' : 'STANDBY'}
          </Text>
        </HStack>

        <svg
          width="100%"
          height={heightPx}
          viewBox={`0 0 240 ${heightPx}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Audio level meter: ${isListening ? `microphone active at ${peakDb} percent` : status}`}
        >
          {bands.map((norm, i) => {
            const barMax = heightPx - 6;
            const barH = Math.max(4, Math.round(norm * barMax));
            const y = Math.round((heightPx - barH) / 2);
            const x = 4 + i * 20;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={12}
                height={barH}
                rx={3}
                fill={activeColor}
              />
            );
          })}
        </svg>
      </VStack>
    </Card>
  );
}
