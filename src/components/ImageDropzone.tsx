'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, AlertCircle } from 'lucide-react';

interface ImageDropzoneProps {
  uploadedImage: string | null;
  onImageUpload: (image: string) => void;
  onImageRemove: () => void;
}

export default function ImageDropzone({
  uploadedImage,
  onImageUpload,
  onImageRemove,
}: ImageDropzoneProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProcessFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Only image files (PNG, JPEG, WebP, GIF) are supported.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Image size must be 10 MB or less.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageUpload(reader.result);
        } else {
          setErrorMessage('Could not read the image file. Please try again.');
        }
      };
      reader.onerror = () => {
        setErrorMessage('Could not read the image file. Please try again.');
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        setErrorMessage('File rejected. Please upload an image under 10 MB.');
        return;
      }
      const file = acceptedFiles[0];
      if (file) handleProcessFile(file);
    },
    [handleProcessFile]
  );

  // Global paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleProcessFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {uploadedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="panel flex items-center gap-3 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage}
                alt="Attached image preview"
                width={48}
                height={48}
                className="h-12 w-12 rounded-[var(--radius-chip)] object-cover flex-shrink-0 border border-line"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text font-medium truncate">Image attached</p>
                <p className="text-[12px] text-faint truncate mt-0.5">Ready for visual analysis</p>
              </div>
              <button
                type="button"
                onClick={onImageRemove}
                className="p-1.5 rounded-[var(--radius-control)] hover:bg-raised text-muted hover:text-text transition-colors cursor-pointer"
                aria-label="Remove attached image"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              {...getRootProps()}
              className={`rounded-[var(--radius-card)] border border-dashed transition-colors cursor-pointer flex items-center justify-center py-3 px-4 ${
                isDragActive ? 'border-accent bg-raised' : 'border-line hover:border-accent bg-surface'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-2 text-muted">
                <ImagePlus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-[12px]">
                  {isDragActive ? 'Drop image to analyze…' : 'Drop an image, click to browse, or paste from clipboard'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Async validation announced politely, in the field's own voice. */}
      <div aria-live="polite" role="status">
        {errorMessage && (
          <p className="text-[12px] text-negative mt-1.5 px-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    </div>
  );
}
