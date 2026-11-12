'use client';

import { useState } from 'react';
import { MicOff, Keyboard } from 'lucide-react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';

export interface PermissionWarningProps {
  sttError: string | null;
  sttSupported: boolean;
  onFocusComposer?: () => void;
}

/**
 * Full-width AppShell banner surfacing microphone permission / browser
 * speech-support state with an immediate typed-mode fallback action.
 */
export default function PermissionWarning({
  sttError,
  sttSupported,
  onFocusComposer,
}: PermissionWarningProps) {
  const [dismissedUnsupported, setDismissedUnsupported] = useState(false);

  if (sttError) {
    return (
      <Banner
        status="warning"
        container="section"
        icon={<MicOff size={18} aria-hidden="true" />}
        title="Microphone unavailable"
        description={`${sttError} You can continue typing or paste an image below.`}
        isDismissable
        endContent={
          onFocusComposer ? (
            <Button
              label="Focus input"
              size="sm"
              variant="secondary"
              onClick={onFocusComposer}
            />
          ) : undefined
        }
      />
    );
  }

  if (!sttSupported && !dismissedUnsupported) {
    return (
      <Banner
        status="info"
        container="section"
        icon={<Keyboard size={18} aria-hidden="true" />}
        title="Typed input active"
        description="Speech recognition is not supported in this browser. Type your request or attach an image below."
        isDismissable
        onDismiss={() => setDismissedUnsupported(true)}
      />
    );
  }

  return null;
}
