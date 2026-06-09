import { useRef, useState, useCallback } from 'react';
import { ImagePlus, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFileSelect: (file: File, previewUrl: string) => void;
}

const SAMPLE_PATH = '/sample-vehicle.jpg';

export function ImageUploader({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]     = useState(false);
  const [preview, setPreview]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

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
    <div className="w-full flex flex-col gap-3">
      {/* Upload zone */}
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
                JPG, PNG, TIFF — max 5 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sample image card */}
      <div
        className="flex items-center gap-4 rounded-lg border px-4 py-3"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}
      >
        {/* Thumbnail */}
        <img
          src={SAMPLE_PATH}
          alt="Sample vehicle image"
          className="rounded shrink-0 object-cover"
          style={{ width: 72, height: 48, borderColor: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.1)' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium" style={{ color: 'oklch(0.88 0.005 240)' }}>
            Sample vehicle image
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'oklch(0.45 0.004 240)' }}>
            Highway overhead view · multiple vehicle types
          </p>
        </div>
        <a
          href={SAMPLE_PATH}
          download="sample-vehicle.jpg"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 font-mono text-[11px] border rounded px-3 py-1.5 transition-all shrink-0"
          style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)', textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}
        >
          <Download size={11} /> Download sample
        </a>
      </div>

      <p className="text-xs text-[color:var(--color-muted)] text-center">
        Prototype uses public overhead imagery (xView / DOTA datasets).
        Production would use proprietary sensor data.
      </p>

      {error && (
        <p className="text-xs text-center" style={{ color: '#fb6a78' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/tiff,.jpg,.jpeg,.png,.tif,.tiff"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
