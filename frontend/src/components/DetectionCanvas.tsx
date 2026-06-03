import { useEffect, useRef, useState, useCallback } from 'react';
import type { Detection, BBox } from '@/lib/types';
import { bandColor } from '@/lib/types';
import { VEHICLE_CLASSES } from '@/lib/types';

interface DrawState {
  startX: number; startY: number;
  currentX: number; currentY: number;
  active: boolean;
}

interface ManualDialogState {
  visible: boolean;
  bbox: BBox | null;
  screenX: number;
  screenY: number;
}

interface Props {
  imageUrl: string;
  detections: Detection[];
  activeId: string | null;
  drawMode: boolean;
  showHeatmap: boolean;
  filterClass: string;
  filterBand: string | null;
  onBoxClick: (id: string) => void;
  onManualAdd: (bbox: BBox, label: string, notes: string) => void;
}

function drawOBB(
  ctx: CanvasRenderingContext2D,
  d: Detection,
  scaleX: number,
  scaleY: number,
  isActive: boolean,
  dimmed: boolean,
) {
  const cx = d.bbox.x * scaleX + (d.bbox.w * scaleX) / 2;
  const cy = d.bbox.y * scaleY + (d.bbox.h * scaleY) / 2;
  const w = d.bbox.w * scaleX;
  const h = d.bbox.h * scaleY;
  const rot = ((d.bbox.rot ?? 0) * Math.PI) / 180;
  const col = bandColor(d.band);

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.15 : 1;
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  if (isActive) {
    // Corner-bracket reticles
    const L = Math.min(w, h) * 0.28;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.fillStyle = `${col}12`;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    const corners = [
      [-w / 2, -h / 2, 1, 1],
      [w / 2, -h / 2, -1, 1],
      [w / 2, h / 2, -1, -1],
      [-w / 2, h / 2, 1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    }

    // Heading arrow
    const headRad = (d.heading - 90) * (Math.PI / 180);
    const arrowLen = h / 2 + 14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(headRad) * arrowLen, Math.sin(headRad) * arrowLen);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(Math.cos(headRad) * arrowLen, Math.sin(headRad) * arrowLen, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  } else {
    // Standard oriented box
    ctx.strokeStyle = col;
    ctx.lineWidth = d.band === 'rev' ? 1.8 : 1.4;
    ctx.fillStyle = `${col}08`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }

  if (d.status === 'rejected') {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2 + 4);
    ctx.lineTo(w / 2 - 4, h / 2 - 4);
    ctx.moveTo(w / 2 - 4, -h / 2 + 4);
    ctx.lineTo(-w / 2 + 4, h / 2 - 4);
    ctx.stroke();
  }

  ctx.restore();

  // Seq number label (outside the box, top-left corner)
  const labelX = d.bbox.x * scaleX;
  const labelY = d.bbox.y * scaleY;
  const seqStr = String(d.seq);
  const labelW = seqStr.length > 1 ? 22 : 15;

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.15 : 1;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(labelX, labelY - 14, labelW, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#05130d';
  ctx.font = '600 9.5px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(seqStr, labelX + labelW / 2, labelY - 4);
  ctx.restore();
}

export function DetectionCanvas({
  imageUrl, detections, activeId, drawMode, showHeatmap,
  filterClass, filterBand, onBoxClick, onManualAdd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<DrawState>({ startX: 0, startY: 0, currentX: 0, currentY: 0, active: false });
  const [dialog, setDialog] = useState<ManualDialogState>({ visible: false, bbox: null, screenX: 0, screenY: 0 });
  const [dialogLabel, setDialogLabel] = useState<string>(VEHICLE_CLASSES[0]);
  const [dialogNotes, setDialogNotes] = useState('');

  const isDimmed = useCallback((d: Detection) => {
    if (filterClass !== 'all' && d.label !== filterClass) return true;
    if (filterBand && d.band !== filterBand) return true;
    return false;
  }, [filterClass, filterBand]);

  const drawAll = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (img.naturalWidth || canvas.width);
    const scaleY = canvas.height / (img.naturalHeight || canvas.height);

    // Heatmap overlay
    if (showHeatmap && detections.length > 0) {
      for (const d of detections) {
        const cx = (d.bbox.x + d.bbox.w / 2) * scaleX;
        const cy = (d.bbox.y + d.bbox.h / 2) * scaleY;
        const r = Math.max(d.bbox.w, d.bbox.h) * scaleX * 1.5;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const col = bandColor(d.band);
        grad.addColorStop(0, `${col}50`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Detection boxes
    for (const d of detections) {
      drawOBB(ctx, d, scaleX, scaleY, d.id === activeId, isDimmed(d));
    }

    // Draw rubber-band while dragging
    const ds = drawRef.current;
    if (ds.active) {
      const x = Math.min(ds.startX, ds.currentX);
      const y = Math.min(ds.startY, ds.currentY);
      const w = Math.abs(ds.currentX - ds.startX);
      const h = Math.abs(ds.currentY - ds.startY);
      ctx.strokeStyle = 'oklch(0.72 0.18 280)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'oklch(0.72 0.18 280 / 0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [detections, activeId, showHeatmap, isDimmed]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(drawAll);
    ro.observe(img);
    if (img.complete) drawAll();
    else img.addEventListener('load', drawAll);
    return () => { ro.disconnect(); img.removeEventListener('load', drawAll); };
  }, [drawAll]);

  // Click handler — select box or start annotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    drawRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawRef.current.active) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    drawRef.current.currentX = e.clientX - rect.left;
    drawRef.current.currentY = e.clientY - rect.top;
    drawAll();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ds = drawRef.current;
    if (!ds.active) return;
    ds.active = false;

    const canvas = canvasRef.current!;
    const img = imgRef.current!;
    const scaleX = canvas.width / (img.naturalWidth || canvas.width);
    const scaleY = canvas.height / (img.naturalHeight || canvas.height);
    const rect = canvas.getBoundingClientRect();

    const x = Math.min(ds.startX, ds.currentX) / scaleX;
    const y = Math.min(ds.startY, ds.currentY) / scaleY;
    const w = Math.abs(ds.currentX - ds.startX) / scaleX;
    const h = Math.abs(ds.currentY - ds.startY) / scaleY;

    if (w < 10 || h < 10) { drawAll(); return; }

    setDialog({
      visible: true,
      bbox: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rot: 0 },
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode) return;
    const canvas = canvasRef.current!;
    const img = imgRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = canvas.width / (img.naturalWidth || canvas.width);
    const scaleY = canvas.height / (img.naturalHeight || canvas.height);

    for (const d of [...detections].reverse()) {
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

  const confirmManual = () => {
    if (dialog.bbox) {
      onManualAdd(dialog.bbox, dialogLabel, dialogNotes);
    }
    setDialog({ visible: false, bbox: null, screenX: 0, screenY: 0 });
    setDialogLabel(VEHICLE_CLASSES[0]);
    setDialogNotes('');
    drawAll();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Analysis target"
        className="w-full object-contain block rounded-lg"
        style={{ maxHeight: 500 }}
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: drawMode ? 'crosshair' : 'pointer' }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Manual annotation dialog */}
      {dialog.visible && (
        <div
          className="absolute z-20 rounded-lg border p-3 shadow-xl flex flex-col gap-2"
          style={{
            left: Math.min(dialog.screenX, (canvasRef.current?.width ?? 400) - 220),
            top: dialog.screenY + 8,
            width: 210,
            background: 'oklch(0.11 0.006 240)',
            borderColor: 'oklch(0.72 0.18 280)',
          }}
        >
          <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'oklch(0.72 0.18 280)' }}>
            Add Detection
          </div>
          <select
            value={dialogLabel}
            onChange={(e) => setDialogLabel(e.target.value)}
            className="w-full rounded px-2 py-1.5 text-[12px] border outline-none"
            style={{ background: 'oklch(0.08 0.005 240)', color: 'oklch(0.92 0.005 240)', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            placeholder="Optional notes…"
            value={dialogNotes}
            onChange={(e) => setDialogNotes(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmManual(); if (e.key === 'Escape') setDialog({ visible: false, bbox: null, screenX: 0, screenY: 0 }); }}
            className="w-full rounded px-2 py-1.5 text-[12px] border outline-none"
            style={{ background: 'oklch(0.08 0.005 240)', color: 'oklch(0.92 0.005 240)', borderColor: 'rgba(255,255,255,0.15)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={confirmManual}
              className="flex-1 py-1.5 rounded text-[12px] font-medium"
              style={{ background: 'oklch(0.72 0.18 280)', color: 'white' }}
            >
              Add
            </button>
            <button
              onClick={() => { setDialog({ visible: false, bbox: null, screenX: 0, screenY: 0 }); drawAll(); }}
              className="flex-1 py-1.5 rounded text-[12px] border"
              style={{ color: 'oklch(0.45 0.004 240)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
