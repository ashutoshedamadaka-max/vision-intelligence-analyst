import { useRef, useState, useCallback } from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFileSelect: (file: File, previewUrl: string) => void;
}

export function ImageUploader({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const blocked = ['image/avif', 'image/webp', 'image/heic', 'image/heif'];
      if (blocked.includes(file.type)) {
        setError(`${file.type.split('/')[1].toUpperCase()} format not supported. Please use JPEG, PNG, or TIFF.`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.');
        return;
      }
      setError(null);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFileSelect(file, url);
    },
    [onFileSelect]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative w-full rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden',
          'border-[color:var(--color-border)]',
          dragging && 'border-[color:var(--color-review)] bg-[color:var(--color-review-dim)]',
          !dragging && !preview && 'hover:border-[color:var(--color-muted)]',
          preview ? 'border-[color:var(--color-confirmed)]' : 'min-h-[240px] flex items-center justify-center',
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Uploaded overhead image"
              className="w-full object-contain max-h-[400px] block"
            />
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[color:var(--color-surface-1)] border border-[color:var(--color-border)] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] transition-colors"
            >
              <RefreshCw size={12} />
              Change image
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[color:var(--color-surface-2)] flex items-center justify-center">
              <ImagePlus size={22} className="text-[color:var(--color-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--color-text)]">
                Drop overhead image or click to upload
              </p>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                JPEG, PNG, TIFF only — max 5 MB
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-[color:var(--color-muted)] text-center">
        Prototype uses public overhead imagery (xView / DOTA datasets).
        Production would use proprietary sensor data.
      </p>

      {error && (
        <p className="mt-2 text-xs text-center" style={{ color: '#fb6a78' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/tiff"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
