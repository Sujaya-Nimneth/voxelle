'use client';

import { useState, useCallback, useEffect } from 'react';
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
      subtitle: 'Session started',
      timestamp: now,
      status: 'normal',
    },
    {
      id: 'init-2',
      title: `${toolDefinitions.length} tools available`,
      subtitle: 'Calendar · Smart home · Calculator · World clock',
      timestamp: now > 0 ? now - 1000 : 0,
      status: 'normal',
    },
    {
      id: 'init-3',
      title: 'No actions currently running',
      subtitle: 'Awaiting input',
      timestamp: now > 0 ? now - 2000 : 0,
      status: 'normal',
    },
  ];
}

/** Session telemetry: a rolling log of what actually happened, newest first. */
export function useSessionEvents() {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>(() =>
    createInitialSessionEvents(0)
  );

  useEffect(() => {
    const mountedAt = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate client mount timestamps without SSR mismatch
    setSessionEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === 'init-1' && ev.timestamp === 0) return { ...ev, timestamp: mountedAt };
        if (ev.id === 'init-2' && ev.timestamp === 0) return { ...ev, timestamp: mountedAt - 1000 };
        if (ev.id === 'init-3' && ev.timestamp === 0) return { ...ev, timestamp: mountedAt - 2000 };
        return ev;
      })
    );
  }, []);

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
