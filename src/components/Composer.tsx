'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  ImagePlus,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  ChatSendButton,
  type ChatComposerInputHandle,
} from '@astryxdesign/core/Chat';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import type { AssistantStatus } from '@/types/types';
import ImageDropzone, { validateAndReadImageFile } from './ImageDropzone';

export interface ComposerProps {
  status: AssistantStatus;
  isListening: boolean;
  sttSupported: boolean;
  interimTranscript?: string;
  uploadedImage: string | null;
  onImageChange: (dataUrl: string | null) => void;
  onSendMessage: (text: string) => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  focusRequestCount?: number;
}

export function Composer({
  status,
  isListening,
  sttSupported,
  interimTranscript,
  uploadedImage,
  onImageChange,
  onSendMessage,
  onToggleListening,
  onStopSpeaking,
  autoSpeak,
  onToggleAutoSpeak,
  focusRequestCount = 0,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [showDropzone, setShowDropzone] = useState(false);
  const [fileError, setFileError] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string>('Attached image');
  const inputHandleRef = useRef<ChatComposerInputHandle | null>(null);

  const canSend = draft.trim().length > 0 || Boolean(uploadedImage);

  // External focus trigger (e.g., PermissionWarning "Focus input" action)
  useEffect(() => {
    if (focusRequestCount > 0) {
      inputHandleRef.current?.focus();
    }
  }, [focusRequestCount]);

  // Global `/` shortcut to focus composer input when not typing in another field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputHandleRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global image paste (⌘V / Ctrl+V) even when attachment drawer is closed
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const pasted = item.getAsFile();
          if (pasted) {
            e.preventDefault();
            validateAndReadImageFile(
              pasted,
              (url, validFile) => {
                onImageChange(url);
                setAttachedFileName(validFile.name || 'Pasted image');
                setFileError('');
              },
              (err) => setFileError(err)
            );
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onImageChange]);

  const submitMessage = useCallback(
    (rawValue?: string) => {
      const text = (rawValue ?? draft).trim();
      if (!text && !uploadedImage) return;
      onSendMessage(text || 'Describe this image');
      setDraft('');
      setFileError('');
      setShowDropzone(false);
    },
    [draft, uploadedImage, onSendMessage]
  );

  const drawerOpen = showDropzone || Boolean(uploadedImage);

  const drawerContent = drawerOpen ? (
    <ChatComposerDrawer
      count={uploadedImage ? 1 : undefined}
      label={uploadedImage ? attachedFileName : 'Attach image'}
    >
      <VStack gap={2}>
        {uploadedImage ? (
          <HStack gap={2} align="center" wrap="wrap">
            <Token
              label={attachedFileName}
              color="blue"
              icon={<ImageIcon size={14} aria-hidden="true" />}
              onRemove={() => {
                onImageChange(null);
                setAttachedFileName('Attached image');
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- local base64 data URI preview cannot use next/image optimizer */}
            <img
              src={uploadedImage}
              alt="Attached image preview"
              className="max-h-20 w-auto rounded-[var(--radius-inner)] border border-[var(--color-border)] object-contain"
            />
          </HStack>
        ) : null}

        <ImageDropzone
          image={uploadedImage}
          isDropzoneVisible={showDropzone || !uploadedImage}
          onFileError={setFileError}
          onImageChange={(url, fileName) => {
            onImageChange(url);
            if (fileName) setAttachedFileName(fileName);
            if (url) {
              setShowDropzone(false);
              setFileError('');
            }
          }}
        />
      </VStack>
    </ChatComposerDrawer>
  ) : undefined;

  return (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={(val) => submitMessage(val)}
      drawer={drawerContent}
      status={fileError ? { type: 'error', message: fileError } : undefined}
      headerContext={
        isListening && interimTranscript ? (
          <Text type="supporting" color="accent" maxLines={1}>
            Hearing: {interimTranscript}
          </Text>
        ) : undefined
      }
      input={
        <ChatComposerInput
          handleRef={inputHandleRef}
          label="Message Voxelle"
          value={draft}
          onChange={setDraft}
          placeholder={
            isListening
              ? 'Listening… speak now or type to override'
              : 'Ask Voxelle anything, drop an image, or press / to type…'
          }
          maxRows={6}
          onFiles={(files) => {
            const firstImage = files.find((f) => f.type.startsWith('image/'));
            if (!firstImage) {
              setFileError('Only image files can be attached.');
              return;
            }
            validateAndReadImageFile(
              firstImage,
              (url, validFile) => {
                onImageChange(url);
                setAttachedFileName(validFile.name);
                setFileError('');
              },
              (err) => setFileError(err)
            );
          }}
        />
      }
      footerActions={
        <HStack gap={1} align="center">
          <IconButton
            label={showDropzone ? 'Hide image dropzone' : 'Attach image'}
            tooltip={showDropzone ? 'Hide attachment tray' : 'Attach or paste image'}
            icon={<ImagePlus size={18} aria-hidden="true" />}
            variant={uploadedImage || showDropzone ? 'secondary' : 'ghost'}
            size="md"
            onClick={() => setShowDropzone((v) => !v)}
          />
          <IconButton
            label={autoSpeak ? 'Mute automatic voice replies' : 'Enable automatic voice replies'}
            tooltip={autoSpeak ? 'Spoken replies on' : 'Spoken replies off'}
            icon={
              autoSpeak ? (
                <Volume2 size={18} aria-hidden="true" />
              ) : (
                <VolumeX size={18} aria-hidden="true" />
              )
            }
            variant="ghost"
            size="md"
            onClick={onToggleAutoSpeak}
          />
        </HStack>
      }
      sendActions={
        <HStack gap={1} align="center">
          {status === 'speaking' ? (
            <Button
              label="Mute"
              icon={<Square size={14} aria-hidden="true" />}
              variant="secondary"
              size="md"
              onClick={onStopSpeaking}
            />
          ) : null}
          <IconButton
            label={isListening ? 'Stop voice input' : 'Start voice input'}
            tooltip={
              !sttSupported
                ? 'Voice input unavailable in this browser'
                : isListening
                  ? 'Stop listening'
                  : 'Start voice input'
            }
            icon={
              isListening ? (
                <MicOff size={18} aria-hidden="true" />
              ) : (
                <Mic size={18} aria-hidden="true" />
              )
            }
            variant={isListening ? 'primary' : 'secondary'}
            size="md"
            isDisabled={!sttSupported}
            onClick={onToggleListening}
          />
        </HStack>
      }
      sendButton={
        <ChatSendButton
          isDisabled={!canSend}
          onSend={() => submitMessage()}
        />
      }
    />
  );
}
