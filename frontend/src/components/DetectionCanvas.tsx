import { useEffect, useRef } from 'react';
import type { Detection } from '@/lib/types';

interface Props {
  imageUrl: string;
  detections: Detection[];
  activeId: string | null;
  onBoxClick: (id: string) => void;
}

function confidenceColor(d: Detection): string {
  if (d.status === 'rejected') return 'oklch(0.45 0.004 240)';
  if (d.status === 'accepted' || d.status === 'relabeled') return 'oklch(0.65 0.14 160)';
  if (d.confidence < 0.60) return 'oklch(0.62 0.22 25)';
  if (d.confidence < 0.80) return 'oklch(0.75 0.16 75)';
  return 'oklch(0.65 0.14 160)';
}

export function DetectionCanvas({ imageUrl, detections, activeId, onBoxClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const draw = () => {
      canvas.width = img.offsetWidth;
      canvas.height = img.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / (img.naturalWidth || canvas.width);
      const scaleY = canvas.height / (img.naturalHeight || canvas.height);

      for (const d of detections) {
        const x = d.bbox.x * scaleX;
        const y = d.bbox.y * scaleY;
        const w = d.bbox.w * scaleX;
        const h = d.bbox.h * scaleY;
        const color = confidenceColor(d);
        const isActive = d.id === activeId;

        ctx.save();
        if (isActive) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = 'oklch(0.72 0.18 280)';
        }

        // Fill
        ctx.fillStyle = isActive
          ? 'oklch(0.72 0.18 280 / 0.15)'
          : d.status === 'rejected'
          ? 'oklch(0.45 0.004 240 / 0.08)'
          : `color-mix(in oklch, ${color} 12%, transparent)`;
        ctx.fillRect(x, y, w, h);

        // Stroke
        ctx.strokeStyle = isActive ? 'oklch(0.72 0.18 280)' : color;
        ctx.lineWidth = isActive ? 2 : 1.5;
        ctx.strokeRect(x, y, w, h);

        // Rejected: X overlay
        if (d.status === 'rejected') {
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + w - 4, y + h - 4);
          ctx.moveTo(x + w - 4, y + 4);
          ctx.lineTo(x + 4, y + h - 4);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.restore();

        // Label background + text
        const label = `${d.label}  ${(d.confidence * 100).toFixed(0)}%`;
        ctx.font = '500 11px Inter, sans-serif';
        const textW = ctx.measureText(label).width;
        const padX = 5;
        const padY = 3;
        const labelH = 17;
        const labelY = y > labelH + 2 ? y - labelH - 1 : y + 1;

        ctx.fillStyle = isActive ? 'oklch(0.72 0.18 280)' : color;
        ctx.fillRect(x, labelY, textW + padX * 2, labelH);
        ctx.fillStyle = 'oklch(0.08 0.005 240)';
        ctx.fillText(label, x + padX, labelY + labelH - padY);
      }
    };

    const ro = new ResizeObserver(draw);
    ro.observe(img);
    if (img.complete) draw();
    else img.addEventListener('load', draw);

    return () => {
      ro.disconnect();
      img.removeEventListener('load', draw);
    };
  }, [detections, activeId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = canvas.width / (img.naturalWidth || canvas.width);
    const scaleY = canvas.height / (img.naturalHeight || canvas.height);

    for (const d of detections) {
      const x = d.bbox.x * scaleX;
      const y = d.bbox.y * scaleY;
      const w = d.bbox.w * scaleX;
      const h = d.bbox.h * scaleY;
      if (px >= x && px <= x + w && py >= y && py <= y + h) {
        onBoxClick(d.id);
        return;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Analysis target"
        className="w-full object-contain max-h-[480px] block rounded-lg"
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
      />
    </div>
  );
}
