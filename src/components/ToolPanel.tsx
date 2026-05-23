'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToolEvent } from '@/types/types';

interface ToolPanelProps {
  toolEvents: ToolEvent[];
  onDismiss: (id: string) => void;
}

const toolIcons: Record<string, string> = {
  add_calendar_event: '📅',
  toggle_smart_home_device: '🏠',
};

const toolLabels: Record<string, string> = {
  add_calendar_event: 'Calendar',
  toggle_smart_home_device: 'Smart Home',
};

function getToolActionText(toolEvent: ToolEvent): string {
  const { toolCall } = toolEvent;

  if (toolCall.name === 'add_calendar_event') {
    if (toolCall.status === 'executing') {
      return `Scheduling "${toolCall.arguments.title}"...`;
    }
    return `"${toolCall.arguments.title}" scheduled for ${toolCall.arguments.date} at ${toolCall.arguments.time}`;
  }

  if (toolCall.name === 'toggle_smart_home_device') {
    if (toolCall.status === 'executing') {
      return `Turning ${toolCall.arguments.state} ${toolCall.arguments.device_name}...`;
    }
    return `${toolCall.arguments.device_name} is now ${toolCall.arguments.state}`;
  }

  return toolCall.status === 'executing' ? 'Executing...' : 'Done';
}

function ToolCard({
  toolEvent,
  onDismiss,
}: {
  toolEvent: ToolEvent;
  onDismiss: () => void;
}) {
  const { toolCall } = toolEvent;
  const isExecuting = toolCall.status === 'executing';
  const isCompleted = toolCall.status === 'completed';
  const icon = toolIcons[toolCall.name] || '⚡';
  const label = toolLabels[toolCall.name] || 'Tool';

  // Auto-dismiss completed cards after 6 seconds
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(onDismiss, 6000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-strong rounded-xl overflow-hidden"
    >
      {/* Shimmer progress bar at top */}
      {isExecuting && (
        <div className="h-0.5 w-full bg-gradient-to-r from-neon-cyan/0 via-neon-purple to-neon-cyan/0 shimmer" />
      )}
      {isCompleted && <div className="h-0.5 w-full bg-neon-green/60" />}

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-light">
              {label}
            </span>
          </div>
          {isCompleted && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={onDismiss}
              className="text-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.button>
          )}
        </div>

        {/* Action text */}
        <p className="text-sm text-foreground/90 leading-relaxed">
          {getToolActionText(toolEvent)}
        </p>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mt-2.5">
          {isExecuting && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-neon-purple"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-1.5 h-1.5 rounded-full bg-neon-green"
            />
          )}
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isExecuting ? 'text-neon-purple' : 'text-neon-green'
            }`}
          >
            {isExecuting ? 'Running' : 'Completed'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ToolPanel({ toolEvents, onDismiss }: ToolPanelProps) {
  if (toolEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <div className="text-2xl mb-2 opacity-30">⚡</div>
        <p className="text-xs text-muted">No active tools</p>
        <p className="text-[10px] text-muted/60 mt-1">
          Tool actions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {toolEvents.map((te) => (
          <ToolCard
            key={te.id}
            toolEvent={te}
            onDismiss={() => onDismiss(te.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
