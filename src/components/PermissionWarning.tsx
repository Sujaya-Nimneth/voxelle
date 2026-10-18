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
      'Speech recognition is not available in this browser. For voice input, please use Chrome, Edge, or Safari.';
  } else if (!ttsSupported) {
    message =
      'Speech synthesis is not supported in this browser. Assistant responses will appear in text only.';
  }

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="px-6 sm:px-8 mt-2"
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(255,117,148,0.1)] border border-[rgba(255,117,148,0.25)] text-[#ff99b3]">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--danger)]" />
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed font-sans">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-[#ff99b3] hover:text-white flex-shrink-0 cursor-pointer"
          aria-label="Dismiss warning"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
