import { cn } from '@/lib/utils';
import type { Detection } from '@/lib/types';

interface Props {
  detections: Detection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function priority(d: Detection): number {
  if (d.status === 'rejected') return 900 + (1 - d.confidence);
  if (d.status === 'accepted' || d.status === 'relabeled') return 500 + (1 - d.confidence);
  return (1 - d.confidence) * 100;
}

export function TriagePanel({ detections, activeId, onSelect }: Props) {
  const sorted = [...detections].sort((a, b) => priority(a) - priority(b));
  const pending = detections.filter((d) => d.status === 'pending').length;
  const confirmed = detections.filter((d) => d.status === 'accepted' || d.status === 'relabeled').length;
  const rejected = detections.filter((d) => d.status === 'rejected').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[color:var(--color-border)]">
        <h2 className="font-serif text-base font-medium text-[color:var(--color-text)]">Triage Queue</h2>
        <p className="text-[10px] text-[color:var(--color-muted)] mt-0.5">Sort: Uncertainty desc.</p>

        <div className="flex gap-2 mt-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[color:var(--color-review)] text-[color:var(--color-review)]">
            {pending} pending
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[color:var(--color-confirmed)] text-[color:var(--color-confirmed)]">
            {confirmed} confirmed
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[color:var(--color-muted)] text-[color:var(--color-muted)]">
            {rejected} rejected
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((d, i) => {
          const isActive = d.id === activeId;
          let dotColor = 'var(--color-review)';
          if (d.status === 'accepted' || d.status === 'relabeled') dotColor = 'var(--color-confirmed)';
          else if (d.status === 'rejected') dotColor = 'var(--color-muted)';
          else if (d.confidence < 0.60) dotColor = 'var(--color-threat)';
          else if (d.confidence >= 0.80) dotColor = 'var(--color-confirmed)';

          return (
            <button
              key={d.id}
              onClick={() => {
                onSelect(d.id);
                document.getElementById(d.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 flex items-center gap-2.5 border-b border-[color:var(--color-border)] transition-colors',
                isActive
                  ? 'bg-[color:var(--color-surface-2)] border-l-2 border-l-[color:var(--color-ai)]'
                  : 'hover:bg-[color:var(--color-surface-1)]',
              )}
            >
              {/* Priority badge (pending only) */}
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-medium"
                style={{
                  background: d.status === 'pending' ? `color-mix(in oklch, ${dotColor} 15%, transparent)` : 'transparent',
                  color: d.status === 'pending' ? dotColor : 'transparent',
                  border: d.status === 'pending' ? `1px solid ${dotColor}` : 'none',
                }}
              >
                {d.status === 'pending' ? i + 1 : ''}
              </span>

              {/* Label + confidence */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[color:var(--color-text)] truncate">
                    {d.relabeledTo ?? d.label}
                  </span>
                  <span className="tabular text-xs shrink-0" style={{ color: dotColor }}>
                    {(d.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {/* Mini bar */}
                <div className="mt-1 h-0.5 w-full bg-[color:var(--color-surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${d.confidence * 100}%`, background: dotColor }}
                  />
                </div>
              </div>

              {/* Status dot */}
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
