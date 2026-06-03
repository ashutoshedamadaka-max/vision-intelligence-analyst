import type { Detection } from '@/lib/types';

interface Props {
  detections: Detection[];
}

export function AggregateSummary({ detections }: Props) {
  const total = detections.length;
  if (total === 0) return null;

  const byClass: Record<string, number> = {};
  for (const d of detections) {
    const key = d.label;
    byClass[key] = (byClass[key] ?? 0) + 1;
  }

  const topClasses = Object.entries(byClass)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const flagged = detections.filter((d) => d.band !== 'hi' && d.status === 'pending').length;
  const manual = detections.filter((d) => d.source === 'manual').length;

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border mt-3"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.09)' }}
    >
      <div className="font-serif text-3xl leading-none">
        {total}
        <span className="text-sm font-sans ml-1.5" style={{ color: 'oklch(0.45 0.004 240)' }}>
          vehicles
        </span>
      </div>

      <div className="w-px h-6 self-stretch" style={{ background: 'rgba(255,255,255,0.09)' }} />

      <div className="flex flex-wrap gap-3">
        {topClasses.map(([cls, count]) => (
          <div key={cls} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'oklch(0.60 0.005 240)' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: '#34d399' }} />
            {count} {cls}
          </div>
        ))}
        {Object.keys(byClass).length > 3 && (
          <div className="text-[12.5px]" style={{ color: 'oklch(0.45 0.004 240)' }}>
            +{Object.keys(byClass).length - 3} more classes
          </div>
        )}
      </div>

      {flagged > 0 && (
        <>
          <div className="w-px h-6 self-stretch" style={{ background: 'rgba(255,255,255,0.09)' }} />
          <div className="font-mono text-[12px]" style={{ color: '#f6b73c' }}>
            ⚑ {flagged} flagged for review
          </div>
        </>
      )}

      {manual > 0 && (
        <>
          <div className="w-px h-6 self-stretch" style={{ background: 'rgba(255,255,255,0.09)' }} />
          <div className="font-mono text-[12px]" style={{ color: 'oklch(0.72 0.18 280)' }}>
            + {manual} analyst-added
          </div>
        </>
      )}
    </div>
  );
}
