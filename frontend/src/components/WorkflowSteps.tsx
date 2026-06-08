import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectionMode } from '@/lib/types';

type Phase = 'idle' | 'uploading' | 'analyzing' | 'review' | 'complete';

interface Props {
  phase: Phase;
  mode?: DetectionMode;
}

const STEPS = [
  { id: 'ingestion', label: 'Ingestion' },
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'detection', label: 'AI Detection' },
  { id: 'review', label: 'Quality Review' },
  { id: 'dissemination', label: 'Dissemination' },
];

function phaseToStep(phase: Phase): number {
  switch (phase) {
    case 'idle': return -1;
    case 'uploading': return 0;
    case 'analyzing': return 2;
    case 'review': return 3;
    case 'complete': return 5;
  }
}

export function WorkflowSteps({ phase, mode }: Props) {
  const activeStep = phaseToStep(phase);
  const modelLabel = 'Open-Source Aerial Vehicle Detection';
  const modelColor = 'var(--color-ai)';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-[color:var(--color-border)] -translate-y-1/2" />

        {STEPS.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          const spinning = active && phase === 'analyzing';

          return (
            <div key={step.id} className="relative flex flex-col items-center gap-1.5 z-10">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border text-xs font-medium transition-all duration-300',
                  done && 'bg-[color:var(--color-confirmed)] border-[color:var(--color-confirmed)] text-[color:var(--color-surface-0)]',
                  active && 'border-[color:var(--color-ai)] bg-[color:var(--color-surface-2)] text-[color:var(--color-ai)]',
                  !done && !active && 'bg-[color:var(--color-surface-1)] border-[color:var(--color-border)] text-[color:var(--color-muted)]',
                )}
                style={active ? { boxShadow: `0 0 10px color-mix(in oklch, var(--color-ai) 40%, transparent)` } : undefined}
              >
                {done ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : spinning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                done && 'text-[color:var(--color-confirmed)]',
                active && 'text-[color:var(--color-ai)]',
                !done && !active && 'text-[color:var(--color-muted)]',
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {(phase === 'analyzing' || phase === 'review' || phase === 'complete') && mode && (
        <div className="flex justify-center mt-3">
          <span
            className="text-xs px-2.5 py-1 rounded-full border font-medium"
            style={{ color: modelColor, borderColor: modelColor, backgroundColor: `color-mix(in oklch, ${modelColor} 10%, transparent)` }}
          >
            Powered by: {modelLabel}
          </span>
        </div>
      )}
    </div>
  );
}
