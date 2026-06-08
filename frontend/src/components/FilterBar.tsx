import type { ConfidenceBand } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  filterClass: string;
  filterBand: ConfidenceBand | null;
  classes: string[];           // unique labels from current detections
  onClassChange: (cls: string) => void;
  onBandChange: (band: ConfidenceBand | null) => void;
}

const BAND_CONFIG: { band: ConfidenceBand; label: string; color: string; dimColor: string }[] = [
  { band: 'hi',  label: 'High ≥85%',    color: '#34d399', dimColor: 'rgba(52,211,153,0.14)' },
  { band: 'rev', label: 'Review 60–84%', color: '#f6b73c', dimColor: 'rgba(246,183,60,0.14)' },
  { band: 'lo',  label: 'Low <60%',     color: '#fb6a78', dimColor: 'rgba(251,106,120,0.14)' },
];

export function FilterBar({ filterClass, filterBand, classes, onClassChange, onBandChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-3">
      {/* Class filter — dynamic from actual detections */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: 'oklch(0.45 0.004 240)' }}>
          Class
        </span>
        {['All', ...classes].map((cls) => {
          const key = cls === 'All' ? 'all' : cls;
          const active = filterClass === key;
          return (
            <button
              key={key}
              onClick={() => onClassChange(active ? 'all' : key)}
              className={cn(
                'text-[12px] border rounded-full px-3 py-1 transition-all',
                active
                  ? 'border-white/30 text-white bg-white/10'
                  : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              )}
            >
              {cls}
            </button>
          );
        })}
      </div>

      <div className="w-px h-5 self-stretch" style={{ background: 'rgba(255,255,255,0.09)' }} />

      {/* Band filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: 'oklch(0.45 0.004 240)' }}>
          Confidence
        </span>
        {BAND_CONFIG.map(({ band, label, color, dimColor }) => {
          const active = filterBand === band;
          return (
            <button
              key={band}
              onClick={() => onBandChange(active ? null : band)}
              className="text-[12px] border rounded-full px-3 py-1 transition-all"
              style={{
                color: active ? color : 'oklch(0.45 0.004 240)',
                borderColor: active ? color : 'rgba(255,255,255,0.1)',
                background: active ? dimColor : 'transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
