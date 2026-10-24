'use client';

import { useState, useCallback } from 'react';
import { toolDefinitions } from '@/lib/tools';
import { generateId } from '@/lib/ids';
import type { SessionEvent } from '@/types/types';

// Initial telemetry entries. Everything here is true: the tool count comes
// from the actual definitions, and no fictional status strings.
export function createInitialSessionEvents(now: number): SessionEvent[] {
  return [
    {
      id: 'init-1',
      title: 'Workspace connected',
      subtitle: 'SESSION STARTED',
      timestamp: now,
      status: 'normal',
    },
    {
      id: 'init-2',
      title: `${toolDefinitions.length} tools available`,
      subtitle: 'CALENDAR · SMART HOME',
      timestamp: now - 1000,
      status: 'normal',
    },
    {
      id: 'init-3',
      title: 'No actions currently running',
      subtitle: 'AWAITING INPUT',
      timestamp: now - 2000,
      status: 'warn',
    },
  ];
}

/** Session telemetry: a rolling log of what actually happened, newest first. */
export function useSessionEvents() {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>(() =>
    createInitialSessionEvents(0)
  );

  const addSessionEvent = useCallback(
    (title: string, subtitle: string, eventStatus: 'normal' | 'warn' | 'success' = 'normal') => {
      setSessionEvents((prev) => [
        {
          id: generateId(),
          title,
          subtitle,
          timestamp: Date.now(),
          status: eventStatus,
        },
        ...prev.slice(0, 6),
      ]);
    },
    []
  );

  return { sessionEvents, setSessionEvents, addSessionEvent };
}
