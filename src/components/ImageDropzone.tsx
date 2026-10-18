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
        setErrorMessage('Image size must be 10MB or less.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        setErrorMessage('File rejected. Please upload an image under 10MB.');
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
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
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
            className="relative"
          >
            <div className="cyber-glass rounded-xl p-2.5 flex items-center gap-3 border border-[rgba(53,230,255,0.3)] bg-[rgba(14,20,34,0.92)] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage}
                alt="Visual signal preview"
                className="h-12 w-12 rounded-lg object-cover flex-shrink-0 border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#edf5ff] font-medium truncate">
                  Visual Signal Attached
                </p>
                <p className="text-[10px] text-[var(--muted)] font-mono truncate mt-0.5">
                  Multimodal vision analysis ready
                </p>
              </div>
              <button
                type="button"
                onClick={onImageRemove}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                aria-label="Remove attached image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={`
                rounded-xl border border-dashed transition-all duration-300 cursor-pointer
                flex items-center justify-center py-3 px-4
                ${
                  isDragActive
                    ? 'border-[var(--cyan)] bg-[rgba(53,230,255,0.1)] shadow-[0_0_20px_rgba(53,230,255,0.15)]'
                    : 'border-[var(--line)] hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors">
                <ImagePlus className="w-4 h-4 text-[var(--cyan)] flex-shrink-0" />
                <span className="text-xs font-mono">
                  {isDragActive
                    ? 'Drop image to analyze...'
                    : 'Drop image, click to browse, or paste from clipboard'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-[var(--danger)] mt-1.5 px-1 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
