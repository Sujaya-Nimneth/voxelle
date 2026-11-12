'use client';

import { useSyncExternalStore } from 'react';
import { audioLevelsStore } from '@/lib/audioLevels';
import type { AssistantStatus } from '@/types/types';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Voxelle geometric aperture mark. Pure SVG bound to Astryx color tokens.
 */
export default function BrandMark({ size = 24, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        stroke="var(--color-border-emphasized)"
        strokeWidth="1.5"
        fill="var(--color-background-surface)"
      />
      <rect x="6.5" y="9" width="2" height="6" rx="1" fill="var(--color-accent)" />
      <rect x="11" y="6" width="2" height="12" rx="1" fill="var(--color-accent)" />
      <rect x="15.5" y="9.5" width="2" height="5" rx="1" fill="var(--color-accent)" />
    </svg>
  );
}

interface SignalStripProps {
  status: AssistantStatus;
  className?: string;
}

const IDLE_BARS = [0.22, 0.36, 0.52, 0.36, 0.22];

/**
 * Compact 5-bar header telemetry visualizer.
 * Subscribes exclusively to `audioLevelsStore` when listening so audio DSP
 * never triggers re-renders in the parent workspace.
 */
export function SignalStrip({ status, className }: SignalStripProps) {
  const levels = useSyncExternalStore(
    audioLevelsStore.subscribe,
    audioLevelsStore.getSnapshot,
    audioLevelsStore.getServerSnapshot
  );

  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isProcessing = status === 'processing';

  const barColor =
    isListening || isSpeaking
      ? 'var(--color-accent)'
      : isProcessing
        ? 'var(--color-warning)'
        : 'var(--color-border-emphasized)';

  // Pick 5 representative bins out of 12 (indices 1, 3, 5, 8, 10)
  const sampleIndices = [1, 3, 5, 8, 10];
  const heights = sampleIndices.map((idx, i) => {
    if (isListening) {
      return Math.max(0.2, Math.min(1, levels[idx] ?? 0.25));
    }
    if (isSpeaking) {
      // Gentle symmetric active silhouette while TTS speaks
      return [0.45, 0.78, 0.95, 0.72, 0.42][i];
    }
    if (isProcessing) {
      return [0.32, 0.52, 0.65, 0.52, 0.32][i];
    }
    return IDLE_BARS[i];
  });

  return (
    <svg
      width={28}
      height={16}
      viewBox="0 0 28 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {heights.map((norm, i) => {
        const h = Math.max(3, Math.round(norm * 14));
        const y = Math.round((16 - h) / 2);
        return (
          <rect
            key={i}
            x={i * 6}
            y={y}
            width={3}
            height={h}
            rx={1.5}
            fill={barColor}
          />
        );
      })}
    </svg>
  );
}

/**
 * Larger geometric signal emblem for empty states.
 */
export function WelcomeSignal({ size = 48, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="var(--color-border-emphasized)"
        strokeWidth="1.5"
        fill="var(--color-background-surface)"
      />
      <circle
        cx="24"
        cy="24"
        r="15"
        stroke="var(--color-accent-muted)"
        strokeWidth="1.25"
      />
      <rect x="13" y="20" width="3" height="8" rx="1.5" fill="var(--color-accent)" />
      <rect x="18.5" y="15" width="3" height="18" rx="1.5" fill="var(--color-accent)" />
      <rect x="24" y="11" width="3" height="26" rx="1.5" fill="var(--color-accent)" />
      <rect x="29.5" y="16" width="3" height="16" rx="1.5" fill="var(--color-accent)" />
      <rect x="35" y="21" width="3" height="6" rx="1.5" fill="var(--color-accent)" />
    </svg>
  );
}
