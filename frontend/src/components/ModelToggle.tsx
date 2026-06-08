import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectionMode } from '@/lib/types';

interface Props {
  mode: DetectionMode;
  onChange: (mode: DetectionMode) => void;
  disabled?: boolean;
}

const OPTIONS: { mode: DetectionMode; icon: React.ReactNode; label: string; sub: string; color: string }[] = [
  {
    mode: 'yolo',
    icon: <Crosshair size={16} />,
    label: 'YOLO Aerial',
    sub: 'Open-source aerial vehicle detection',
    color: 'var(--color-confirmed)',
  },
];

export function ModelToggle({ mode, onChange, disabled }: Props) {
  return (
    <div className="w-full">
      <p className="text-xs text-[color:var(--color-muted)] mb-2 uppercase tracking-widest font-medium">
        Detection Model
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const active = mode === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => !disabled && onChange(opt.mode)}
              disabled={disabled}
              style={active ? { borderColor: opt.color, color: opt.color } : undefined}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-150',
                'border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]',
                active && 'bg-[color:var(--color-surface-2)]',
                !active && !disabled && 'hover:border-[color:var(--color-muted)] cursor-pointer',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="mt-0.5 shrink-0">{opt.icon}</span>
              <div>
                <p className="text-sm font-medium leading-tight">{opt.label}</p>
                <p className="text-xs text-[color:var(--color-muted)] mt-0.5 leading-snug">{opt.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
