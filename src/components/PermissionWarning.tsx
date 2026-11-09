'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

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
      'Speech recognition is not available in this browser. For voice input, use Chrome, Edge, or Safari.';
  } else if (!ttsSupported) {
    message =
      'Speech synthesis is not supported in this browser. Assistant responses will appear in text only.';
  }

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-5 sm:px-8 mt-2"
      role="alert"
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-card)] bg-pill-warn-bg text-pill-warn-ink">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-[var(--radius-control)] hover:opacity-70 transition-opacity flex-shrink-0 cursor-pointer"
          aria-label="Dismiss warning"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
