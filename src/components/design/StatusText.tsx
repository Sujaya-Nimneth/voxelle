'use client';

import { Text } from '@astryxdesign/core/Text';
import type { AssistantStatus } from '@/types/types';

interface StatusTextProps {
  status: AssistantStatus;
}

const LABELS: Record<AssistantStatus, string> = {
  idle: 'Ready',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
};

export default function StatusText({ status }: StatusTextProps) {
  return (
    <Text
      type="label"
      color={status === 'listening' || status === 'speaking' ? 'accent' : 'secondary'}
    >
      {LABELS[status]}
    </Text>
  );
}
