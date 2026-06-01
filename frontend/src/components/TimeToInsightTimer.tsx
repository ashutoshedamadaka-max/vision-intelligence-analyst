import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  startedAt: number;
  frozenAt: number | null;
}

function formatElapsed(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSec = Math.floor(ms / 1000);
  const secs = totalSec % 60;
  const mins = Math.floor(totalSec / 60) % 60;
  const hrs = Math.floor(totalSec / 3600);

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${hh}:${mm}:${ss}.${tenths}`;
}

export function TimeToInsightTimer({ startedAt, frozenAt }: Props) {
  const [elapsed, setElapsed] = useState(frozenAt ? frozenAt - startedAt : Date.now() - startedAt);
  const frozen = frozenAt !== null;

  useEffect(() => {
    if (frozen) {
      setElapsed(frozenAt! - startedAt);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(id);
  }, [startedAt, frozenAt, frozen]);

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-medium">
        {frozen ? 'Time to Insight' : 'Analysis in Progress'}
      </span>
      <span
        className={cn('font-serif tabular text-3xl font-medium transition-all duration-300')}
        style={{
          color: 'var(--color-confirmed)',
          filter: frozen ? 'none' : 'drop-shadow(0 0 8px oklch(0.65 0.14 160 / 0.6))',
        }}
      >
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
