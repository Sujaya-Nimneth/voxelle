'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PermissionWarningProps {
  error: string | null;
  sttSupported: boolean;
  ttsSupported: boolean;
  onDismiss: () => void;
}

export default function PermissionWarning({
  error,
  sttSupported,
  ttsSupported,
  onDismiss,
}: PermissionWarningProps) {
  let message = error;

  if (!sttSupported) {
    message =
      'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the full voice experience.';
  } else if (!ttsSupported) {
    message =
      'Speech synthesis is not available in this browser. Text responses will still appear in the chat.';
  }

  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        className="mx-4 mt-2"
      >
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mt-0.5"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-danger/90 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors text-danger/60 hover:text-danger flex-shrink-0 cursor-pointer"
            aria-label="Dismiss warning"
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
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
