import { cn } from '@/lib/utils';
import type { Detection, ConfidenceBand } from '@/lib/types';
import { bandColor } from '@/lib/types';

interface Props {
  detections: Detection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function priority(d: Detection): number {
  if (d.manual) return 800;                                 // analyst-defined sinks below confirmed
  if (d.status === 'rejected') return 900;
  if (d.status === 'confirmed' || d.status === 'relabeled') return 500;
  return (1 - d.detectionConfidence) * 100;                // most uncertain first
}

export function TriagePanel({ detections, activeId, onSelect }: Props) {
  const sorted = [...detections].sort((a, b) => priority(a) - priority(b));
  const pending   = detections.filter((d) => d.status === 'pending').length;
  const confirmed = detections.filter((d) => d.status === 'confirmed' || d.status === 'relabeled').length;
  const rejected  = detections.filter((d) => d.status === 'rejected').length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.09)' }}>
        <h2 className="font-serif text-lg font-medium">Triage Queue</h2>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'oklch(0.45 0.004 240)' }}>
          SORT: UNCERTAINTY ↓
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border" style={{ color: '#f6b73c', borderColor: 'rgba(246,183,60,0.4)' }}>
            {pending} pending
          </span>
          <span className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border" style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.4)' }}>
            {confirmed} confirmed
          </span>
          <span className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border" style={{ color: '#fb6a78', borderColor: 'rgba(251,106,120,0.4)' }}>
            {rejected} rejected
          </span>
        </div>

        {/* Confidence legend */}
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div className="px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'oklch(0.40 0.004 240)' }}>
              Confidence Bands
            </span>
          </div>
          {[
            { color: '#34d399', label: 'High',    range: '≥ 85%',   desc: 'Clear detection' },
            { color: '#f6b73c', label: 'Review',  range: '60 – 84%', desc: 'Needs verification' },
            { color: '#fb6a78', label: 'Low',     range: '< 60%',   desc: 'Speculative' },
            { color: '#38bdf8', label: 'Analyst', range: 'Manual',  desc: 'Analyst-defined' },
          ].map(({ color, label, range, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-2.5 py-2"
              style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] font-medium" style={{ color }}>{label}</span>
                  <span className="font-mono text-[10px]" style={{ color: 'oklch(0.40 0.004 240)' }}>{range}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'oklch(0.38 0.004 240)' }}>{desc}</span>
              </div>
              <div className="w-10 h-1 rounded-full overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ background: color, width: label === 'High' ? '100%' : label === 'Review' ? '72%' : label === 'Analyst' ? '100%' : '46%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map((d) => {
          const isActive = d.id === activeId;
          const col = d.manual
            ? '#38bdf8'
            : d.status === 'confirmed' || d.status === 'relabeled'
            ? '#34d399'
            : d.status === 'rejected'
            ? '#fb6a78'
            : bandColor(d.band);

          const bandTag: Record<ConfidenceBand, string> = {
            hi: '', rev: 'REVIEW', lo: 'LOW', man: 'ANALYST',
          };
          const tag = d.manual ? 'ANALYST' : d.status === 'pending' ? bandTag[d.band] : '';
          const pct = Math.round(d.detectionConfidence * 100);

          return (
            <button
              key={d.id}
              onClick={() => {
                onSelect(d.id);
                document.getElementById(d.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors',
                isActive ? 'border-l-2' : 'hover:opacity-80'
              )}
              style={{
                borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderLeftColor: isActive ? 'oklch(0.72 0.18 280)' : 'transparent',
              }}
            >
              {/* Seq number */}
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px]"
                style={{ color: col, border: `1px solid ${col}` }}
              >
                {d.seq}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium truncate" style={{ color: 'oklch(0.92 0.005 240)' }}>
                    {d.relabeledTo ?? d.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tag && (
                      <span
                        className="font-mono text-[8.5px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: col,
                          background: d.manual
                            ? 'rgba(56,189,248,0.14)'
                            : d.band === 'rev'
                            ? 'rgba(246,183,60,0.14)'
                            : 'rgba(251,106,120,0.14)',
                        }}
                      >
                        {tag}
                      </span>
                    )}
                    <span className="font-mono text-[12px] tabular" style={{ color: col }}>
                      {d.manual ? '—' : `${pct}%`}
                    </span>
                  </div>
                </div>
                <div className="mt-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: d.manual ? '100%' : `${pct}%`, background: col }} />
                </div>
              </div>

              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
