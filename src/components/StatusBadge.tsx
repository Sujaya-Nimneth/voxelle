'use client';

import { Circle, Loader2, Mic, Volume2 } from 'lucide-react';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import type { AssistantStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AssistantStatus;
  isDegraded?: boolean;
}

const STATUS_META: Record<
  AssistantStatus,
  { label: string; variant: BadgeVariant; Icon: typeof Circle; spin?: boolean }
> = {
  idle: { label: 'Ready', variant: 'neutral', Icon: Circle },
  listening: { label: 'Listening', variant: 'info', Icon: Mic },
  processing: { label: 'Thinking', variant: 'warning', Icon: Loader2, spin: true },
  speaking: { label: 'Speaking', variant: 'blue', Icon: Volume2 },
};

/**
 * Header / telemetry status badge with non-color icon + text cues.
 */
export default function StatusBadge({ status, isDegraded }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const { Icon } = meta;

  return (
    <Badge
      variant={isDegraded && status === 'idle' ? 'warning' : meta.variant}
      label={isDegraded && status === 'idle' ? 'Demo mode' : meta.label}
      icon={
        <Icon
          size={12}
          strokeWidth={2}
          aria-hidden="true"
          className={meta.spin ? 'animate-spin' : undefined}
        />
      }
    />
  );
}
