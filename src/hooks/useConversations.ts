'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { generateId } from '@/lib/ids';
import type { Message } from '@/types/types';

// Multi-conversation storage, all in this browser's localStorage:
//  - voxelle_conversations        → index of {id, title, createdAt, updatedAt}
//  - voxelle_active_conversation  → id of the open thread
//  - voxelle_conv_<id>            → that thread's messages
// Message payloads are sanitized before writing so base64 images can't blow
// the ~5MB localStorage quota.

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const INDEX_KEY = 'voxelle_conversations';
const ACTIVE_KEY = 'voxelle_active_conversation';
const convKey = (id: string) => `voxelle_conv_${id}`;

function loadIndex(): ConversationMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (c): c is ConversationMeta =>
          c && typeof c.id === 'string' && typeof c.title === 'string'
      );
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveIndex(list: ConversationMeta[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

function sanitizeForStorage(messages: Message[]): Message[] {
  return messages
    .filter((m) => m.role !== 'system')
    .slice(-50)
    .map((m) => {
      const copy = { ...m };
      delete copy.isStreaming; // transient render flag, never persisted
      if (copy.image && copy.image.length > 500) {
        copy.image = undefined;
      }
      return copy;
    });
}

function loadMessages(id: string): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(convKey(id)) || '[]');
    if (Array.isArray(parsed)) return parsed as Message[];
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveMessages(id: string, messages: Message[]) {
  try {
    localStorage.setItem(convKey(id), JSON.stringify(sanitizeForStorage(messages)));
  } catch (err) {
    console.warn('Could not persist conversation:', err);
  }
}

function titleFromMessages(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.content.trim());
  if (!firstUser) return 'New conversation';
  const t = firstUser.content.trim();
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

/**
 * Thread management: the index, the active thread, and persistence. The
 * message state itself lives in the chat pipeline; this hook owns which
 * thread is open and what's on disk.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const conversationsRef = useRef<ConversationMeta[]>([]);
  const activeIdRef = useRef<string | null>(null);

  // Mount-only hydration: adopt the stored index and active thread, or
  // create the first thread for a fresh visitor.
  useEffect(() => {
    let index = loadIndex();
    let storedActive = null;
    try {
      storedActive = localStorage.getItem(ACTIVE_KEY);
    } catch {
      // Ignore
    }

    if (index.length === 0) {
      // First visit — or migrate the pre-threads single-history format
      // (voxelle_chat_history) into one thread so nothing is lost.
      let legacy: Message[] = [];
      try {
        const raw = localStorage.getItem('voxelle_chat_history');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) legacy = parsed as Message[];
        }
      } catch {
        // Ignore parse errors
      }

      const now = Date.now();
      index = [
        {
          id: generateId(),
          title: legacy.length > 0 ? titleFromMessages(legacy) : 'New conversation',
          createdAt: now,
          updatedAt: now,
        },
      ];
      saveIndex(index);
      if (legacy.length > 0) {
        saveMessages(index[0].id, legacy);
        try {
          localStorage.removeItem('voxelle_chat_history');
        } catch {
          // Ignore
        }
      }
    }

    const active =
      storedActive && index.some((c) => c.id === storedActive) ? storedActive : index[0].id;

    conversationsRef.current = index;
    activeIdRef.current = active;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only hydration from external storage
    setConversations(index);
    setActiveId(active);
    hydratedRef.current = true;
  }, []);

  const persistActive = useCallback((messages: Message[]) => {
    if (!hydratedRef.current) return;
    const id = activeIdRef.current;
    if (!id) return;
    // Defer storage & metadata updates while tokens are actively streaming
    // so 60ms delta ticks don't thrash localStorage or Sidebar state.
    if (messages.some((m) => m.isStreaming)) return;

    saveMessages(id, messages);

    const prev = conversationsRef.current;
    const target = prev.find((c) => c.id === id);
    if (!target) return;

    const nextTitle =
      target.title === 'New conversation' ? titleFromMessages(messages) : target.title;
    if (messages.length === 0 && nextTitle === target.title) return;

    const next = prev.map((c) =>
      c.id === id
        ? {
            ...c,
            title: nextTitle,
            updatedAt: Date.now(),
          }
        : c
    );
    conversationsRef.current = next;
    saveIndex(next);
    setConversations(next);
  }, []);

  // Stable reference for the pipeline: bumps thread metadata (title/updatedAt)
  // as messages flow without re-creating pipeline callbacks.
  const persistRef = useRef(persistActive);
  useEffect(() => {
    persistRef.current = persistActive;
  }, [persistActive]);

  const readActive = useCallback((id?: string): Message[] => {
    const target = id ?? activeIdRef.current;
    if (!target) return [];
    return loadMessages(target);
  }, []);

  const switchTo = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // Ignore
    }
  }, []);

  const createNew = useCallback((): string => {
    const now = Date.now();
    const meta: ConversationMeta = {
      id: generateId(),
      title: 'New conversation',
      createdAt: now,
      updatedAt: now,
    };
    const next = [meta, ...conversationsRef.current];
    conversationsRef.current = next;
    setConversations(next);
    saveIndex(next);
    switchTo(meta.id);
    return meta.id;
  }, [switchTo]);

  // Deletes a thread from storage and state. The consumer orchestrates what
  // happens to the open pipeline (switch or new) — this hook only owns data.
  const remove = useCallback((id: string) => {
    const next = conversationsRef.current.filter((c) => c.id !== id);
    try {
      localStorage.removeItem(convKey(id));
    } catch {
      // Ignore
    }
    conversationsRef.current = next;
    saveIndex(next);
    setConversations(next);
  }, []);

  const persistActiveStable = useCallback((m: Message[]) => persistRef.current(m), []);

  return useMemo(
    () => ({
      conversations,
      activeId,
      readActive,
      persistActive: persistActiveStable,
      switchTo,
      createNew,
      remove,
    }),
    [conversations, activeId, readActive, persistActiveStable, switchTo, createNew, remove]
  );
}
