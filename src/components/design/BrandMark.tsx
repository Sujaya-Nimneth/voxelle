'use client';

import { useSyncExternalStore } from 'react';
import { audioLevelsStore } from '@/lib/audioLevels';

interface BrandMarkProps {
  size?: number;
  /** Show the product wordmark next to the mark. */
  showName?: boolean;
  className?: string;
}

/**
 * The product's drawn mark: a small signal/waveform glyph in the one accent
 * hue. Replaces the old gradient "glow" square. Decorative by default.
 */
export default function BrandMark({ size = 28, showName = false, className = '' }: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="var(--raised)" stroke="var(--border)" />
        <g fill="var(--accent)">
          <rect x="6" y="12" width="2.2" height="4" rx="1.1" />
          <rect x="10" y="9" width="2.2" height="10" rx="1.1" />
          <rect x="14" y="6" width="2.2" height="16" rx="1.1" />
          <rect x="18" y="10" width="2.2" height="8" rx="1.1" />
          <rect x="22" y="12" width="2.2" height="4" rx="1.1" />
        </g>
      </svg>
      {showName && (
        <span className="text-[15px] font-semibold tracking-tight text-text">Voxelle</span>
      )}
    </span>
  );
}

/**
 * The signature element: a persistent signal strip whose shape follows the
 * assistant state, driven by the real microphone analyser store. It is the
 * only component that subscribes to per-frame levels, so live updates never
 * re-render the app tree.
 */
export function SignalStrip({
  status,
  compact = false,
}: {
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  compact?: boolean;
}) {
  const levels = useSyncExternalStore(
    audioLevelsStore.subscribe,
    audioLevelsStore.getSnapshot,
    audioLevelsStore.getServerSnapshot
  );

  const bars = [0.28, 0.5, 0.8, 0.45, 1, 0.6, 0.38, 0.7, 0.3, 0.55, 0.24];
  const isListening = status === 'listening';
  const isActive = status !== 'idle';
  const height = compact ? 20 : 34;

  return (
    <div
      className="inline-flex items-end gap-[3px]"
      style={{ height }}
      role="img"
      aria-label={isListening ? 'Live microphone signal' : status === 'processing' ? 'Processing signal' : status === 'speaking' ? 'Playback signal' : 'Voice signal idle'}
    >
      {bars.map((base, i) => {
        let scale = base * 0.5;
        if (isListening) scale = Math.max(0.14, Math.min(1, levels[i] ?? 0.12));
        else if (status === 'speaking') scale = 0.35 + ((i % 4) * 0.16);
        else if (status === 'processing') scale = 0.3 + ((i % 3) * 0.14);
        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-transform duration-100 ease-out origin-bottom"
            style={{
              height,
              transform: `scaleY(${scale})`,
              background: 'var(--accent)',
              opacity: isActive ? 0.95 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
