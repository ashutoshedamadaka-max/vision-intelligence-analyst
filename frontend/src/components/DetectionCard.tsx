import { useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Detection } from '@/lib/types';
import { bandColor, VEHICLE_CLASSES as CLASSES } from '@/lib/types';

interface Props {
  detection: Detection;
  isActive: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onRelabel: (id: string, newLabel: string) => void;
  onUndo: (id: string) => void;
  onClick: (id: string) => void;
  dimmed?: boolean;
}

function StatusBadge({ status }: { status: Detection['status'] }) {
  const map = {
    pending: { label: 'Pending', color: '#f6b73c', bg: 'rgba(246,183,60,0.12)' },
    accepted: { label: 'Confirmed', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    rejected: { label: 'Rejected', color: '#fb6a78', bg: 'rgba(251,106,120,0.12)' },
    relabeled: { label: 'Relabeled', color: 'oklch(0.72 0.18 280)', bg: 'oklch(0.72 0.18 280 / 0.12)' },
  };
  const { label, color, bg } = map[status];
  return (
    <span
      className="font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded border"
      style={{ color, borderColor: color, background: bg }}
    >
      {label}
    </span>
  );
}

export function DetectionCard({ detection: d, isActive, onAccept, onReject, onRelabel, onUndo, onClick, dimmed }: Props) {
  const [relabeling, setRelabeling] = useState(false);
  const [labelInput, setLabelInput] = useState(d.relabeledTo ?? d.label);
  const col = bandColor(d.band);
  const reviewed = d.status !== 'pending';
  const pct = Math.round(d.detectionConfidence * 100);

  const submitRelabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed) onRelabel(d.id, trimmed);
    setRelabeling(false);
  };

  const borderColor = d.band === 'rev'
    ? 'rgba(246,183,60,0.35)'
    : d.band === 'lo'
    ? 'rgba(251,106,120,0.32)'
    : 'rgba(255,255,255,0.09)';

  return (
    <motion.div
      id={d.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dimmed ? 0.3 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(d.id)}
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-all duration-200 flex flex-col gap-3',
        d.status === 'rejected' && 'opacity-40',
        isActive && 'ring-1 ring-[color:var(--color-ai)]'
      )}
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: isActive ? 'oklch(0.72 0.18 280)' : borderColor,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center border"
              style={{ color: col, borderColor: col }}
            >
              {d.seq}
            </span>
            {relabeling ? (
              <select
                autoFocus
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onBlur={submitRelabel}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold bg-transparent border-b outline-none flex-1"
                style={{ color: col, borderColor: col }}
              >
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <h3 className="text-[15px] font-semibold truncate" style={{ color: d.status === 'rejected' ? 'oklch(0.45 0.004 240)' : col }}>
                {d.relabeledTo ?? d.label}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={d.status} />
            {d.source === 'manual' && (
              <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ color: 'oklch(0.72 0.18 280)', background: 'oklch(0.72 0.18 280 / 0.12)' }}>
                Manual
              </span>
            )}
          </div>
        </div>
        <div className="font-mono text-2xl tabular shrink-0" style={{ color: col }}>
          {pct}<span className="text-xs ml-0.5">%</span>
        </div>
      </div>

      {/* Detection confidence */}
      <div>
        <div className="font-mono text-[9px] tracking-[0.16em] uppercase mb-1.5 flex justify-between" style={{ color: 'oklch(0.45 0.004 240)' }}>
          <span>Detection confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
          </div>
          <span className="font-mono text-[12px] tabular shrink-0" style={{ color: col }}>{pct}%</span>
        </div>
      </div>

      {/* Classification distribution — AI only */}
      {d.source === 'ai' && d.classification.length > 0 && (
        <div>
          <div className="font-mono text-[9px] tracking-[0.16em] uppercase mb-2 flex justify-between" style={{ color: 'oklch(0.45 0.004 240)' }}>
            <span>Classification</span>
            <span>top-3</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {d.classification.map((c, i) => (
              <div key={c.label} className="grid items-center gap-2" style={{ gridTemplateColumns: '76px 1fr 32px' }}>
                <span className="text-[11.5px] truncate" style={{ color: i === 0 ? 'oklch(0.92 0.005 240)' : 'oklch(0.60 0.005 240)' }}>
                  {c.label}
                </span>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: i === 0 ? col : 'rgba(255,255,255,0.22)' }}
                  />
                </div>
                <span className="font-mono text-[11px] text-right tabular" style={{ color: i === 0 ? 'oklch(0.92 0.005 240)' : 'oklch(0.45 0.004 240)' }}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telemetry */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { k: 'Est. Length', v: d.estLength },
          { k: 'Heading', v: `${d.heading}°` },
          { k: 'Sensor', v: d.provenance.sensorType },
          { k: 'Captured', v: new Date(d.provenance.timestamp).toISOString().slice(11, 19) + 'Z' },
        ].map(({ k, v }) => (
          <div key={k} className="border rounded px-2 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="font-mono text-[8.5px] tracking-[0.12em] uppercase" style={{ color: 'oklch(0.45 0.004 240)' }}>{k}</div>
            <div className="font-mono text-[11.5px] mt-0.5" style={{ color: 'oklch(0.92 0.005 240)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {d.notes && (
        <div className="flex items-start gap-1.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'oklch(0.60 0.005 240)' }}>{d.notes}</p>
        </div>
      )}

      {/* Chain of custody */}
      {reviewed && d.status !== 'pending' && (
        <div className="font-mono text-[10px]" style={{ color: 'oklch(0.45 0.004 240)' }}>
          {d.status === 'accepted' || d.status === 'relabeled'
            ? `CONFIRMED by ANALYST-07 @ ${new Date(d.provenance.timestamp).toISOString().slice(11, 19)}Z`
            : `REJECTED by ANALYST-07 @ ${new Date(d.provenance.timestamp).toISOString().slice(11, 19)}Z`
          }
        </div>
      )}

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        {reviewed ? (
          <button
            onClick={() => onUndo(d.id)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: 'oklch(0.45 0.004 240)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
          >
            <RotateCcw size={11} /> Undo
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(d.id)}
              className="flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded text-[12px] border transition-all"
              style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,211,153,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Check size={11} strokeWidth={2.5} /> Accept
            </button>
            <button
              onClick={() => onReject(d.id)}
              className="flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded text-[12px] border transition-all"
              style={{ color: '#fb6a78', borderColor: 'rgba(251,106,120,0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251,106,120,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={11} strokeWidth={2.5} /> Reject
            </button>
            <button
              onClick={() => { setRelabeling(true); setLabelInput(d.relabeledTo ?? d.label); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-[12px] border transition-all"
              style={{ color: 'oklch(0.45 0.004 240)', borderColor: 'rgba(255,255,255,0.09)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
            >
              ↕ Relabel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
