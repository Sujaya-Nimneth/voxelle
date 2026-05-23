'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

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
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="px-4">
      <AnimatePresence mode="wait">
        {uploadedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative"
          >
            <div className="glass rounded-xl p-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage}
                alt="Upload preview"
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-light truncate">
                  Image attached
                </p>
                <p className="text-[10px] text-muted">
                  Will be sent with your next message
                </p>
              </div>
              <button
                onClick={onImageRemove}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted hover:text-danger flex-shrink-0 cursor-pointer"
                aria-label="Remove image"
              >
                <svg
                  width="16"
                  height="16"
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
                rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
                flex items-center justify-center py-3 px-4
                ${
                  isDragActive
                    ? 'dropzone-active border-neon-cyan bg-neon-cyan-dim/30'
                    : 'border-surface-border hover:border-muted/30 hover:bg-white/[0.02]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-2 text-muted">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-xs">
                  {isDragActive
                    ? 'Drop image here...'
                    : 'Drop an image or click to upload'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
