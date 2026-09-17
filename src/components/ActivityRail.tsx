'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { AssistantStatus, SessionEvent, ToolEvent } from '@/types/types';

interface ActivityRailProps {
  status: AssistantStatus;
  sessionEvents: SessionEvent[];
  toolEvents: ToolEvent[];
  onDismissToolEvent: (id: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const BAR_BASE_HEIGHTS = [11, 21, 31, 16, 39, 25, 17, 29, 12, 20, 9];

export default function ActivityRail({
  status,
  sessionEvents,
  toolEvents,
  onDismissToolEvent,
  isOpenMobile = false,
  onCloseMobile,
}: ActivityRailProps) {
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isProcessing = status === 'processing';
  const isActive = isListening || isSpeaking || isProcessing;

  const getMeterStatusLabel = () => {
    switch (status) {
      case 'listening':
        return 'LISTENING...';
      case 'processing':
        return 'PROCESSING...';
      case 'speaking':
        return 'SPEAKING...';
      default:
        return 'VOICE READY';
    }
  };

  const getMeterStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'var(--cyan)';
      case 'processing':
      case 'speaking':
        return 'var(--violet)';
      default:
        return 'var(--cyan)';
    }
  };

  const railContent = (
    <aside className="w-[316px] flex-shrink-0 flex flex-col justify-between h-full p-5 lg:py-7 lg:px-5 border-l border-[var(--line)] bg-[rgba(12,17,30,0.85)] backdrop-blur-2xl z-40 overflow-y-auto">
      <div>
        {/* Rail Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-[11px] tracking-[1.3px] font-medium text-[#aebdd2]">
              LIVE ACTIVITY
            </h2>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded text-[var(--muted)] hover:text-white"
                aria-label="Close activity rail"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--lime)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] glow-lime animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Listening Surface Meter */}
        <div className="my-6 p-4 rounded-[13px] border border-[var(--line)] bg-white/[0.025]">
          <div className="flex justify-between items-center text-[11px] text-[#b8c5d7] mb-3.5">
            <span>Listening surface</span>
            <span
              className="font-mono text-[10px] tracking-wider"
              style={{ color: getMeterStatusColor() }}
            >
              {getMeterStatusLabel()}
            </span>
          </div>

          <div className="h-[43px] flex items-center justify-between gap-[4px] px-1">
            {BAR_BASE_HEIGHTS.map((baseH, idx) => {
              // Dynamic animation multipliers
              const animDuration =
                status === 'listening'
                  ? 0.5 + (idx % 3) * 0.15
                  : status === 'speaking'
                  ? 0.7 + (idx % 4) * 0.12
                  : status === 'processing'
                  ? 1.0 + (idx % 2) * 0.2
                  : 2.2;

              const targetHeight =
                status === 'listening'
                  ? [baseH * 0.5, Math.min(42, baseH * 1.5 + 10), baseH * 0.7, baseH]
                  : status === 'speaking'
                  ? [baseH * 0.8, Math.min(42, baseH * 1.4 + 6), baseH * 0.6, baseH]
                  : status === 'processing'
                  ? [baseH * 0.9, baseH * 1.2, baseH * 0.8]
                  : [baseH, baseH * 1.1, baseH];

              return (
                <motion.i
                  key={idx}
                  className="w-[4px] rounded-[10px] not-italic block"
                  style={{
                    background: 'linear-gradient(to top, var(--violet), var(--cyan))',
                    opacity: isActive ? 0.95 : 0.65,
                  }}
                  animate={{
                    height: targetHeight,
                    opacity: isActive ? [0.8, 1, 0.8] : 0.6,
                  }}
                  transition={{
                    duration: animDuration,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: idx * 0.05,
                    ease: 'easeInOut',
                  }}
                  initial={{ height: baseH }}
                />
              );
            })}
          </div>
        </div>

        {/* Tool Execution Cards (when active) */}
        <AnimatePresence>
          {toolEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 space-y-2"
            >
              <div className="font-mono text-[10px] tracking-[1.2px] text-[var(--cyan)] font-medium uppercase px-0.5">
                Active Tool Telemetry
              </div>
              {toolEvents.map((te) => (
                <div
                  key={te.id}
                  className="p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 relative overflow-hidden"
                >
                  {te.toolCall.status === 'executing' && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-bar" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <span>{te.toolCall.name === 'add_calendar_event' ? '📅' : '🏠'}</span>
                      <span className="capitalize">
                        {te.toolCall.name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {te.toolCall.status === 'completed' && (
                      <button
                        onClick={() => onDismissToolEvent(te.id)}
                        className="text-[var(--muted)] hover:text-white text-xs cursor-pointer"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#b8c5d7] mt-1 font-mono">
                    {te.result || (te.toolCall.status === 'executing' ? 'Applying changes...' : 'Done')}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Log */}
        <div className="mt-2">
          <div className="font-mono text-[10px] tracking-[1.2px] text-[#66748d] font-medium uppercase mb-2.5 px-0.5">
            SESSION LOG
          </div>

          <div className="space-y-[9px]">
            {sessionEvents.map((event) => {
              const isWarn = event.status === 'warn';
              const isSuccess = event.status === 'success';

              return (
                <div
                  key={event.id}
                  className="relative py-[11px] pr-[10px] pl-[26px] border-l border-[rgba(124,147,181,0.25)] text-[11px] text-[#c5d1e1] bg-gradient-to-r from-white/[0.035] to-transparent rounded-r-lg"
                >
                  {/* Status dot on the border line */}
                  <span
                    className={`absolute -left-[4px] top-[15px] w-[7px] h-[7px] rounded-full ${
                      isWarn
                        ? 'bg-[#ffc561] shadow-[0_0_9px_#ffc561]'
                        : isSuccess
                        ? 'bg-[var(--lime)] shadow-[0_0_9px_var(--lime)]'
                        : 'bg-[var(--cyan)] shadow-[0_0_9px_var(--cyan)]'
                    }`}
                  />
                  <div className="leading-snug">{event.title}</div>
                  <span className="block font-mono text-[9px] text-[#65758d] mt-1">
                    {event.subtitle}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Privacy Notice at bottom */}
      <div className="mt-6 p-3 rounded-[10px] bg-[rgba(73,68,145,0.13)] border border-[rgba(146,108,255,0.18)] text-[10px] text-[#9b9abe] leading-relaxed">
        <b className="text-[#d3c8ff] font-semibold block mb-0.5">Private by design.</b>
        Voice is processed only while you&apos;re speaking.
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Activity Rail */}
      <div className="hidden lg:block h-screen sticky top-0">
        {railContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 h-full"
            >
              {railContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
