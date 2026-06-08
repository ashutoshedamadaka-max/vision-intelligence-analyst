import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalysisResult } from '@/lib/types';
import { bandColor } from '@/lib/types';

interface Props {
  previewUrl: string;
  result: AnalysisResult | null; // null while API pending, populated on return
  startedAt: number;
  onProceed: (result: AnalysisResult) => void;
  onReset: () => void;
}

const BOOT = [
  { text: 'LINK ESTABLISHED · sensor EO-PAN', cls: 'g', delay: 0 },
  { text: 'INGEST · frame received · validating…', cls: 't', delay: 250 },
  { text: 'PREPROCESS · orthorectify · GSD ~0.31 m', cls: 't', delay: 500 },
  { text: 'DETECT · yolo-world-aerial (open-source) · scanning…', cls: 'b', delay: 760 },
];

export function DetectionSequence({ previewUrl, result, startedAt, onProceed, onReset }: Props) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef    = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  const sweepXRef         = useRef(0);
  const resultRef         = useRef<AnalysisResult | null>(null);
  const acquiredRef       = useRef(new Set<string>());
  const sweepDoneRef      = useRef(false);
  const completeCalledRef = useRef(false);
  const skipRef           = useRef(false);
  const autoProceedRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const [logLines,    setLogLines]    = useState<{ text: string; cls: string }[]>([]);
  const [statusLabel, setStatusLabel] = useState<'SCANNING' | 'COMPLETE'>('SCANNING');
  const [showDone,    setShowDone]    = useState(false);
  const [skipPending, setSkipPending] = useState(false);
  const [timedOut,    setTimedOut]    = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [countdown,   setCountdown]   = useState(5);

  const addLog = useCallback((text: string, cls: string) => {
    setLogLines(prev => [...prev, { text, cls }]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const scaleX = canvas.width  / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scan sweep
    const sx = sweepXRef.current;
    if (sx > 0 && sx < canvas.width + 60) {
      const grad = ctx.createLinearGradient(sx - 50, 0, sx, 0);
      grad.addColorStop(0, 'rgba(139,140,249,0)');
      grad.addColorStop(1, 'rgba(139,140,249,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 50, 0, 50, canvas.height);
      ctx.strokeStyle = '#8b8cf9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, canvas.height);
      ctx.stroke();
    }

    // Acquired detection boxes
    const dets = resultRef.current?.detections ?? [];
    for (const d of dets) {
      if (!acquiredRef.current.has(d.id)) continue;
      const col = bandColor(d.band);
      const x = d.bbox.x * scaleX;
      const y = d.bbox.y * scaleY;
      const w = d.bbox.w * scaleX;
      const h = d.bbox.h * scaleY;
      const L = Math.min(w, h) * 0.28;

      ctx.fillStyle = `${col}12`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      const corners: [number, number, number, number][] = [
        [x,     y,     1,  1], [x + w, y,     -1,  1],
        [x + w, y + h, -1, -1], [x,   y + h,  1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * L);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * L, cy);
        ctx.stroke();
      }

      const seqStr = String(d.seq);
      const lw = seqStr.length > 1 ? 22 : 15;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x, y - 14, lw, 13, 3);
      ctx.fill();
      ctx.fillStyle = '#05130d';
      ctx.font = '600 9.5px "IBM Plex Mono",monospace';
      ctx.textAlign = 'center';
      ctx.fillText(seqStr, x + lw / 2, y - 4);
    }
  }, []);

  const completeScan = useCallback(() => {
    if (completeCalledRef.current) return;
    completeCalledRef.current = true;
    const r = resultRef.current!;

    // Reveal remaining boxes
    for (const d of r.detections) acquiredRef.current.add(d.id);
    drawFrame();

    setStatusLabel('COMPLETE');
    const t1 = setTimeout(() => addLog(`CLASSIFY · ${r.detections.length} scored · yolo-world-aerial · open-source`, 'w'), 80);
    const t2 = setTimeout(() => addLog('TRIAGE · sort uncertainty ↓', 'b'), 280);
    const t3 = setTimeout(() => {
      addLog('READY FOR HUMAN REVIEW', 'g');
      setShowDone(true);

      // Countdown 5 → 0, then auto-proceed to Quality Review
      let remaining = 5;
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0 && countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      }, 1000);
      autoProceedRef.current = setTimeout(() => onProceed(r), 5000);
    }, 500);
    timeoutIds.current.push(t1, t2, t3);
  }, [addLog, drawFrame]);

  // Main sweep animation
  useEffect(() => {
    const SWEEP_DELAY    = 960;
    const SWEEP_DURATION = 3200;

    // Clock
    intervalId.current = setInterval(() => setElapsed(Date.now() - startedAt), 60);

    // 30-second timeout — if no result, show error state
    const noResultTimeout = setTimeout(() => {
      if (!resultRef.current) {
        cancelAnimationFrame(rafRef.current);
        if (intervalId.current) clearInterval(intervalId.current);
        setTimedOut(true);
      }
    }, 30000);
    timeoutIds.current.push(noResultTimeout);

    // Boot telemetry
    BOOT.forEach(({ text, cls, delay }) => {
      const t = setTimeout(() => addLog(text, cls), delay);
      timeoutIds.current.push(t);
    });

    let sweepStart = 0;

    function frame(now: number) {
      if (!sweepStart) sweepStart = now;
      const progress = Math.min((now - sweepStart) / SWEEP_DURATION, 1);
      const cw = canvasRef.current?.offsetWidth ?? 800;
      sweepXRef.current = 40 + progress * (cw - 40);

      // Acquire detections that the sweep has crossed
      const img  = imgRef.current;
      const dets = resultRef.current?.detections ?? [];
      if (img && img.naturalWidth && dets.length) {
        const scaleX = cw / img.naturalWidth;
        for (const d of dets) {
          if (!acquiredRef.current.has(d.id)) {
            const centerX = (d.bbox.x + d.bbox.w / 2) * scaleX;
            if (sweepXRef.current >= centerX) {
              acquiredRef.current.add(d.id);
              const clsMap: Record<string, string> = { hi: 'g', rev: 'a', lo: 'r', man: 'b' };
              const cls = clsMap[d.band] ?? 'w';
              addLog(`ACQUIRE [${d.seq}] · ${d.label} · det ${Math.round(d.detectionConfidence * 100)}%`, cls);
              if (d.band !== 'hi') addLog(`  ⚑ low certainty · flag review`, cls);
            }
          }
        }
      }

      drawFrame();

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        // Sweep complete
        sweepXRef.current = cw + 100;
        drawFrame();
        sweepDoneRef.current = true;

        if (resultRef.current) {
          completeScan();
        } else {
          addLog('MODEL RESPONSE · awaiting…', 'a');
        }
      }
    }

    const sweepTimeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(frame);
    }, SWEEP_DELAY);
    timeoutIds.current.push(sweepTimeout);

    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
      if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      timeoutIds.current.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle result arriving from backend
  useEffect(() => {
    if (!result) return;
    resultRef.current = result;

    if (skipRef.current) {
      onProceed(result);
      return;
    }

    if (sweepDoneRef.current) {
      completeScan();
    }
    // else: sweep frame loop will call completeScan when it finishes
  }, [result, completeScan, onProceed]);

  // Keep canvas in sync with image size
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => drawFrame());
    ro.observe(img);
    if (img.complete) drawFrame();
    else img.addEventListener('load', drawFrame);
    return () => { ro.disconnect(); img.removeEventListener('load', drawFrame); };
  }, [drawFrame]);

  function handleSkip() {
    if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (result) {
      onProceed(result);
    } else {
      skipRef.current = true;
      setSkipPending(true);
    }
  }

  const fmtElapsed = (ms: number) => {
    const s = ms / 1000;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    const ds = Math.floor((s % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${ds}`;
  };

  const logColor = (cls: string) =>
    cls === 'g' ? '#34d399'
    : cls === 'a' ? '#f6b73c'
    : cls === 'r' ? '#fb6a78'
    : cls === 'b' ? '#8b8cf9'
    : cls === 't' ? 'oklch(0.40 0.004 240)'
    : 'oklch(0.92 0.005 240)';

  return (
    <div className="relative flex flex-col gap-4">
      {/* Skip / proceed button */}
      <button
        onClick={handleSkip}
        className="absolute font-mono text-[11px] border rounded px-3 py-1.5 transition-colors"
        style={{ top: 0, right: 0, zIndex: 10, color: 'oklch(0.45 0.004 240)', borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(0,0,0,0.5)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
      >
        {result ? '→ Proceed now' : '⏩ Skip'}
      </button>

      {timedOut ? (
        <div className="flex flex-col items-center gap-5 py-16 text-center rounded-xl border" style={{ borderColor: 'rgba(251,106,120,0.3)', background: 'rgba(251,106,120,0.06)' }}>
          <div className="text-3xl" style={{ color: '#fb6a78' }}>⚠</div>
          <div>
            <div className="font-serif text-xl" style={{ color: '#fb6a78' }}>No objects detected</div>
            <div className="font-mono text-[11px] mt-1.5" style={{ color: 'oklch(0.45 0.004 240)' }}>
              Detection timed out after 30 seconds — the system could not identify any objects in this image.
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-lg text-[13px] font-medium border transition-all"
              style={{ color: '#fb6a78', borderColor: 'rgba(251,106,120,0.4)', background: 'rgba(251,106,120,0.1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251,106,120,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(251,106,120,0.1)')}
            >
              ↺ Try a different image
            </button>
          </div>
        </div>
      ) : skipPending && !result ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#34d399', borderTopColor: 'transparent' }} />
          <p className="font-mono text-[12px]" style={{ color: 'oklch(0.60 0.005 240)' }}>
            Awaiting detection results…
          </p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 296px' }}>
          {/* Sensor feed */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.09)', background: '#0a0a0c' }}>
            <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: 'oklch(0.45 0.004 240)' }}>
                SENSOR FEED · EO-PAN · GSD ~0.31m
              </span>
              <span className="font-mono text-[11px] flex items-center gap-1.5" style={{ color: statusLabel === 'SCANNING' ? '#fb6a78' : '#34d399' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    background: statusLabel === 'SCANNING' ? '#fb6a78' : '#34d399',
                    animation: statusLabel === 'SCANNING' ? 'pulse 1s infinite' : 'none',
                  }}
                />
                {statusLabel}
              </span>
            </div>

            <div className="relative">
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Sensor feed"
                className="w-full block object-contain"
                style={{ maxHeight: 460, display: 'block' }}
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              />
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)', opacity: 0.5 }}
              />
              {/* Corner brackets */}
              {([
                ['2px', '2px', undefined, undefined],
                ['2px', undefined, undefined, '2px'],
                [undefined, '2px', '2px', undefined],
                [undefined, undefined, '2px', '2px'],
              ] as const).map(([top, left, bottom, right], i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    top, left, bottom, right,
                    width: 20, height: 20,
                    borderTop:    (top    !== undefined ? '1.5px solid rgba(139,140,249,0.5)' : undefined),
                    borderBottom: (bottom !== undefined ? '1.5px solid rgba(139,140,249,0.5)' : undefined),
                    borderLeft:   (left   !== undefined ? '1.5px solid rgba(139,140,249,0.5)' : undefined),
                    borderRight:  (right  !== undefined ? '1.5px solid rgba(139,140,249,0.5)' : undefined),
                  }}
                />
              ))}
            </div>
          </div>

          {/* Telemetry console */}
          <div className="rounded-xl overflow-hidden border flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)' }}>
            <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: 'oklch(0.45 0.004 240)' }}>Pipeline Telemetry</span>
              <span className="font-mono text-[9px]" style={{ color: statusLabel === 'SCANNING' ? '#34d399' : 'oklch(0.45 0.004 240)' }}>
                {statusLabel === 'SCANNING' ? '● live' : 'done'}
              </span>
            </div>

            <div
              ref={logRef}
              className="flex-1 px-3.5 py-3 overflow-y-auto"
              style={{
                fontFamily: '"IBM Plex Mono",monospace',
                fontSize: 11,
                lineHeight: 1.85,
                minHeight: 200,
                maxHeight: 320,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.18) transparent',
              }}
            >
              {logLines.map((l, i) => (
                <div key={i} style={{ whiteSpace: 'nowrap', color: logColor(l.cls) }}>
                  {l.text}
                </div>
              ))}
              {statusLabel === 'SCANNING' && (
                <span
                  className="inline-block w-[7px] h-[13px] align-middle"
                  style={{ background: '#34d399', animation: 'pulse 1s infinite' }}
                />
              )}
            </div>

            {/* TTI clock */}
            <div className="px-3.5 py-2.5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'oklch(0.40 0.004 240)' }}>
                Time to insight
              </div>
              <div className="font-mono text-2xl mt-0.5 tabular-nums" style={{ color: '#34d399', textShadow: '0 0 16px rgba(52,211,153,0.35)' }}>
                {fmtElapsed(elapsed)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detection complete bar */}
      {showDone && result && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5"
          style={{ borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.06)' }}
        >
          <div>
            <div className="font-serif text-[22px]">Detection complete</div>
            <div className="font-mono text-[11px] mt-1" style={{ color: 'oklch(0.45 0.004 240)' }}>
              {result.detections.length} candidates
              {' · '}
              {result.detections.filter(d => d.band !== 'hi').length} flagged for review
              {' · '}
              sorted by uncertainty
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="px-3 py-2 rounded-lg text-[13px] border transition-all"
              style={{ color: 'oklch(0.45 0.004 240)', borderColor: 'rgba(255,255,255,0.09)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
              onClick={() => {
                // Reset and replay
                sweepXRef.current = 0;
                acquiredRef.current = new Set();
                sweepDoneRef.current = false;
                completeCalledRef.current = false;
                setLogLines([]);
                setStatusLabel('SCANNING');
                setShowDone(false);
                setElapsed(0);
              }}
            >
              ↺ Replay
            </button>
            <button
              onClick={() => {
                if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
                if (countdownRef.current) clearInterval(countdownRef.current);
                onProceed(result);
              }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium border transition-all flex items-center gap-2"
              style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,211,153,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(52,211,153,0.1)')}
            >
              Proceed to Quality Review →
              <span className="font-mono text-[11px] opacity-60">({countdown}s)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
