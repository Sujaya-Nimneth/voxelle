'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileInput } from '@astryxdesign/core/FileInput';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function validateAndReadImageFile(
  file: File,
  onSuccess: (dataUrl: string, file: File) => void,
  onError: (msg: string) => void
) {
  if (!file.type.startsWith('image/')) {
    onError('Please choose an image file (PNG, JPEG, WebP, or GIF).');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    onError('Image is too large. Maximum size is 4 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      onError('');
      onSuccess(reader.result, file);
    }
  };
  reader.onerror = () => {
    onError('Could not read the selected image file.');
  };
  reader.readAsDataURL(file);
}

export interface ImageDropzoneProps {
  image: string | null;
  onImageChange: (dataUrl: string | null, fileName?: string) => void;
  onFileError?: (message: string) => void;
  isDropzoneVisible?: boolean;
  enableGlobalPaste?: boolean;
}

/**
 * Wraps Astryx `FileInput` (dropzone mode) with optional Ctrl/Cmd+V image paste
 * support and an accessible polite live region for validation messages.
 */
export default function ImageDropzone({
  image,
  onImageChange,
  onFileError,
  isDropzoneVisible = true,
  enableGlobalPaste = false,
}: ImageDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Clear tracked File handle when parent clears uploadedImage (e.g. on send)
  const effectiveFile = image ? selectedFile : null;

  const handleError = useCallback(
    (msg: string) => {
      setErrorMsg(msg);
      if (msg && onFileError) onFileError(msg);
    },
    [onFileError]
  );

  const handleFile = useCallback(
    (file: File) => {
      validateAndReadImageFile(
        file,
        (dataUrl, validFile) => {
          setSelectedFile(validFile);
          onImageChange(dataUrl, validFile.name);
        },
        handleError
      );
    },
    [handleError, onImageChange]
  );

  useEffect(() => {
    if (!enableGlobalPaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const pasted = item.getAsFile();
          if (pasted) {
            e.preventDefault();
            handleFile(pasted);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [enableGlobalPaste, handleFile]);

  return (
    <VStack gap={2}>
      <VisuallyHidden>
        <Text as="span" role="status" aria-live="polite">
          {errorMsg}
        </Text>
      </VisuallyHidden>
      {isDropzoneVisible ? (
        <FileInput
          label="Attach image"
          isLabelHidden
          mode="dropzone"
          accept="image/*"
          maxSize={MAX_IMAGE_BYTES}
          value={effectiveFile}
          width="100%"
          placeholder="Drop an image, click to browse, or paste with ⌘V (max 4 MB)"
          status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
          onChange={(files) => {
            if (!files) {
              setSelectedFile(null);
              setErrorMsg('');
              onImageChange(null);
              return;
            }
            const file = Array.isArray(files) ? files[0] : files;
            if (file) handleFile(file);
          }}
        />
      ) : null}
    </VStack>
  );
}
