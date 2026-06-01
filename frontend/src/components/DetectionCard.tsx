import { useState } from 'react';
import { Check, X, Tag, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProvenanceTag } from './ProvenanceTag';
import { cn } from '@/lib/utils';
import type { Detection, DetectionStatus } from '@/lib/types';

interface Props {
  detection: Detection;
  isActive: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onRelabel: (id: string, newLabel: string) => void;
  onUndo: (id: string) => void;
  onClick: (id: string) => void;
}

function uncertaintyText(confidence: number): string {
  if (confidence >= 0.80) return 'High confidence — clear identification';
  if (confidence >= 0.60) return 'Moderate confidence — needs analyst review';
  if (confidence >= 0.40) return 'Low confidence — speculative; likely needs rejection';
  return 'Very low confidence — recommend rejection';
}

function statusColor(status: DetectionStatus, confidence: number): string {
  if (status === 'accepted') return 'var(--color-confirmed)';
  if (status === 'rejected') return 'var(--color-muted)';
  if (status === 'relabeled') return 'var(--color-ai)';
  if (confidence < 0.60) return 'var(--color-threat)';
  if (confidence < 0.80) return 'var(--color-review)';
  return 'var(--color-confirmed)';
}

function StatusBadge({ status }: { status: DetectionStatus }) {
  const map: Record<DetectionStatus, { label: string; color: string }> = {
    pending: { label: 'Pending Review', color: 'var(--color-review)' },
    accepted: { label: 'Confirmed', color: 'var(--color-confirmed)' },
    rejected: { label: 'Rejected', color: 'var(--color-muted)' },
    relabeled: { label: 'Relabeled', color: 'var(--color-ai)' },
  };
  const { label, color } = map[status];
  return (
    <Badge
      variant="outline"
      className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 border"
      style={{ color, borderColor: color }}
    >
      {label}
    </Badge>
  );
}

export function DetectionCard({ detection: d, isActive, onAccept, onReject, onRelabel, onUndo, onClick }: Props) {
  const [relabeling, setRelabeling] = useState(false);
  const [labelInput, setLabelInput] = useState(d.label);
  const color = statusColor(d.status, d.confidence);
  const reviewed = d.status !== 'pending';

  const submitRelabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && trimmed !== d.label) {
      onRelabel(d.id, trimmed);
    }
    setRelabeling(false);
  };

  return (
    <motion.div
      id={d.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(d.id)}
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-all duration-200 flex flex-col gap-3',
        'border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]',
        isActive && 'border-[color:var(--color-ai)] bg-[color:var(--color-surface-2)]',
        d.status === 'rejected' && 'opacity-50',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {relabeling ? (
            <input
              autoFocus
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onBlur={submitRelabel}
              onKeyDown={(e) => { if (e.key === 'Enter') submitRelabel(); if (e.key === 'Escape') setRelabeling(false); }}
              onClick={(e) => e.stopPropagation()}
              className="text-base font-semibold bg-transparent border-b border-[color:var(--color-ai)] outline-none text-[color:var(--color-text)] w-full"
            />
          ) : (
            <h3 className="text-base font-semibold" style={{ color }}>
              {d.relabeledTo ?? d.label}
            </h3>
          )}
          <StatusBadge status={d.status} />
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif tabular text-2xl font-medium" style={{ color }}>
            {(d.confidence * 100).toFixed(0)}
            <span className="text-sm font-sans ml-0.5">%</span>
          </div>
        </div>
      </div>

      {/* Confidence bar + text */}
      <div className="flex flex-col gap-1.5">
        <Progress
          value={d.confidence * 100}
          className="h-1.5"
          indicatorColor={color}
        />
        <p className="text-xs" style={{ color }}>
          {uncertaintyText(d.confidence)}
        </p>
      </div>

      {/* Notes (AI-generated) */}
      {d.notes && (
        <div className="flex items-start gap-2">
          <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-[color:var(--color-ai)]" />
          <p className="text-xs text-[color:var(--color-text-subtle)] leading-relaxed">{d.notes}</p>
        </div>
      )}

      {/* Provenance */}
      <ProvenanceTag provenance={d.provenance} />

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        {reviewed ? (
          <button
            onClick={() => onUndo(d.id)}
            className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] transition-colors"
          >
            <RotateCcw size={11} /> Undo
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(d.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[color:var(--color-confirmed)] text-[color:var(--color-confirmed)] hover:bg-[color:var(--color-confirmed-dim)] transition-colors"
            >
              <Check size={12} strokeWidth={2.5} /> Accept
            </button>
            <button
              onClick={() => onReject(d.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[color:var(--color-threat)] text-[color:var(--color-threat)] hover:bg-[color:var(--color-threat-dim)] transition-colors"
            >
              <X size={12} strokeWidth={2.5} /> Reject
            </button>
            <button
              onClick={() => { setRelabeling(true); setLabelInput(d.label); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[color:var(--color-border)] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-ai)] hover:border-[color:var(--color-ai)] transition-colors"
            >
              <Tag size={12} /> Relabel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
