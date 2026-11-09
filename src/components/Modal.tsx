'use client';

import { useEffect, useId, useRef, ReactNode, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  borderColor?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function emptySubscribe() {
  return () => {};
}

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  borderColor,
}: ModalProps) {
  const headlineId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Escape to close, body scroll lock, focus management: focus moves into the
  // dialog on open, Tab cycles within it, and the trigger regains focus on close.
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Everything outside the dialog is inert while it is open (web
    // guidelines: background must not be focusable behind an overlay).
    const shell = document.querySelector('.app-shell');
    shell?.setAttribute('inert', '');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      shell?.removeAttribute('inert');
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={headlineId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70"
          />

          {/* Modal Dialog Card */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={borderColor ? { borderColor } : undefined}
            className="relative w-full max-w-lg panel bg-surface p-6 float-shadow z-10 max-h-[90vh] flex flex-col outline-none overscroll-contain"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2.5">
                {icon}
                <h2 id={headlineId} className="text-[16px] font-semibold text-text">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-4 overflow-y-auto flex-1 pr-1 overscroll-contain">{children}</div>

            {/* Optional Footer */}
            {footer && <div className="mt-5 flex justify-end flex-shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
