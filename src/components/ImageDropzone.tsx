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
            <div className="cyber-glass rounded-xl p-2.5 flex items-center gap-3 border border-[rgba(53,230,255,0.3)] bg-[rgba(14,20,34,0.9)] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage}
                alt="Upload preview"
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
                onClick={onImageRemove}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                aria-label="Remove image"
              >
                ✕
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
                <span className="text-[15px] text-[var(--cyan)]">⌁</span>
                <span className="text-xs font-mono">
                  {isDragActive
                    ? 'Drop image to analyze...'
                    : 'Drop an image or click to attach to signal'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
