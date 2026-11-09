'use client';

import { useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Home, CheckCircle2, ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import AudioMeter from './AudioMeter';
import { SignalStrip } from './design/BrandMark';
import type { AssistantStatus, SessionEvent, ToolEvent } from '@/types/types';

interface ActivityRailProps {
  status: AssistantStatus;
  sessionEvents: SessionEvent[];
  toolEvents: ToolEvent[];
  onDismissToolEvent: (id: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const RAIL_WIDTH = 300;

// Telemetry subtitles arrive as terse uppercase labels from the event log.
// Render them in the product's sentence-case voice without touching the
// honest data or the hooks that emit it; real data strings (paths, timings)
// are left exactly as they are.
function humanizeSubtitle(value: string): string {
  const isShouty = /[A-Z]/.test(value) && !/[a-z]/.test(value) && !value.includes('/');
  if (!isShouty) return value;
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function ActivityRail({
  status,
  sessionEvents,
  toolEvents,
  onDismissToolEvent,
  isOpenMobile = false,
  onCloseMobile,
}: ActivityRailProps) {
  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpenMobile, onCloseMobile]);

  const meterLabel: Record<AssistantStatus, string> = {
    idle: 'Voice standby',
    listening: 'Live input',
    processing: 'Thinking',
    speaking: 'Synthesizing',
  };

  const handleDownloadIcs = useCallback((toolEvent: ToolEvent) => {
    if (!toolEvent.ics) return;
    const blob = new Blob([toolEvent.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'voxelle-event.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const railContent = (
    <aside className="w-full h-full flex flex-col justify-between p-5 border-l border-line bg-ground overflow-y-auto" aria-label="Session activity">
      <div>
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[16px] font-semibold text-text">Session</h2>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised cursor-pointer"
              aria-label="Close activity rail"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Signal spine — the one element only this product has. */}
        <div className="mt-4 panel p-4">
          <div className="flex justify-between items-center text-[12px] mb-3">
            <span className="text-muted">Voice signal</span>
            <span className="text-faint">{meterLabel[status]}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <SignalStrip status={status} />
            <AudioMeter status={status} />
          </div>
        </div>

        {/* Tool activity — first, because it answers "what actually ran". */}
        <AnimatePresence>
          {toolEvents.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
              aria-label="Tool activity"
            >
              <h3 className="label mb-2">Tool activity</h3>
              <ul className="space-y-2">
                {toolEvents.map((te) => (
                  <li key={te.id} className="p-3 rounded-[var(--radius-card)] bg-surface border border-line relative overflow-hidden">
                    {te.toolCall.status === 'executing' && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-text min-w-0">
                        {te.toolCall.name === 'add_calendar_event' ? (
                          <Calendar className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <Home className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
                        )}
                        <span className="capitalize truncate">{te.toolCall.name.replace(/_/g, ' ')}</span>
                      </div>
                      {te.toolCall.status === 'completed' ? (
                        <button
                          onClick={() => onDismissToolEvent(te.id)}
                          className="text-muted hover:text-text cursor-pointer p-0.5 flex-shrink-0"
                          aria-label="Dismiss tool result"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted mt-1.5 flex items-start gap-1.5">
                      {te.toolCall.status === 'completed' && (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 flex-shrink-0 mt-[2px] ${te.simulated ? 'text-warning' : 'text-positive'}`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="min-w-0 break-words">
                        {te.result ||
                          (te.toolCall.status === 'executing'
                            ? 'Running on the server…'
                            : 'Action completed')}
                      </span>
                    </p>

                    {te.ics && te.toolCall.status === 'completed' && (
                      <button
                        onClick={() => handleDownloadIcs(te)}
                        className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-control)] text-[12px] font-medium text-text bg-raised hover:opacity-80 border border-line transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        Add to calendar (.ics)
                      </button>
                    )}

                    {te.simulated && te.toolCall.status === 'completed' && (
                      <div className="mt-2 flex items-center gap-1 text-[12px] text-warning">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        <span>Simulated. No device connected.</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Event log — one hue, no colored dot per row. */}
        <section className="mt-6" aria-label="Event log">
          <h3 className="label mb-2">Event log</h3>
          {sessionEvents.length === 0 ? (
            <p className="text-[12px] text-faint">No events yet.</p>
          ) : (
            <ul className="space-y-0">
              {sessionEvents.map((event) => (
                <li
                  key={event.id}
                  className="relative py-2.5 pl-4 border-l border-line text-[12px] text-muted"
                >
                  <span
                    className={`absolute -left-[3px] top-[15px] w-[5px] h-[5px] rounded-full ${
                      event.status === 'warn' ? 'bg-warning' : 'bg-faint'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="leading-snug text-text">{event.title}</div>
                  <span className="block text-[12px] text-faint mt-0.5">{humanizeSubtitle(event.subtitle)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Honest privacy note as quiet text, not a callout. */}
      <div className="mt-6 pt-4 border-t border-line text-[12px] text-faint leading-relaxed flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <span className="text-muted font-medium">What leaves this page.</span>{' '}
          Only your messages and attached images go to the configured provider.
          The voice signal is measured in your browser.
        </p>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-screen sticky top-0" style={{ width: 'var(--rail-w)' }}>
        {railContent}
      </div>

      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end" role="dialog" aria-modal="true" aria-label="Session activity">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: RAIL_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: RAIL_WIDTH }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 h-full"
              style={{ width: RAIL_WIDTH, maxWidth: '90vw' }}
            >
              {railContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(ActivityRail);
