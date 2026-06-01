import { Printer, RefreshCw } from 'lucide-react';
import type { Detection, DetectionMode } from '@/lib/types';

interface Props {
  detections: Detection[];
  analysisId: string;
  timeToInsightMs: number;
  signOffAt: string;
  mode: DetectionMode;
  onReset: () => void;
}

function formatMs(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  } catch {
    return iso;
  }
}

export function DisseminationCard({ detections, analysisId, timeToInsightMs, signOffAt, mode, onReset }: Props) {
  const confirmed = detections.filter((d) => d.status === 'accepted' || d.status === 'relabeled');

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      {/* Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[color:var(--color-border)] rounded text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] transition-colors"
        >
          <RefreshCw size={12} /> Start New Analysis
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[color:var(--color-confirmed)] rounded text-[color:var(--color-confirmed)] hover:bg-[color:var(--color-confirmed-dim)] transition-colors"
        >
          <Printer size={12} /> Export Report
        </button>
      </div>

      {/* Report card */}
      <div id="dissemination-root" className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[color:var(--color-border)] pb-4">
          <div>
            <h1 className="font-serif text-xl tracking-[0.2em] uppercase text-[color:var(--color-text)]">
              Intelligence Report
            </h1>
            <p className="text-xs text-[color:var(--color-muted)] mt-1 tabular">{analysisId}</p>
            <p className="text-xs text-[color:var(--color-muted)]">
              Analyst sign-off: {formatTimestamp(signOffAt)}
            </p>
            <p className="text-xs text-[color:var(--color-muted)]">
              Detection model: {mode === 'yolo' ? 'YOLO Aerial (Roboflow)' : 'OpenAI gpt-4o-mini Vision'}
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif tabular text-3xl text-[color:var(--color-confirmed)]">
              {formatMs(timeToInsightMs)}
            </div>
            <p className="text-[10px] text-[color:var(--color-muted)] uppercase tracking-widest">
              Time to Insight
            </p>
          </div>
        </div>

        {/* Detections table */}
        {confirmed.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)] text-center py-4">
            No detections confirmed in this analysis.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                {['#', 'Object', 'Confidence', 'Sensor', 'Timestamp'].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] pb-2 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confirmed.map((d, i) => (
                <tr
                  key={d.id}
                  className={i % 2 === 0 ? 'bg-[color:var(--color-surface-0)]' : ''}
                >
                  <td className="py-2 pr-4 tabular text-[color:var(--color-muted)] text-xs">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-[color:var(--color-text)]">
                    {d.relabeledTo ?? d.label}
                    {d.status === 'relabeled' && (
                      <span className="ml-1.5 text-[10px] text-[color:var(--color-ai)]">(relabeled)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 tabular text-[color:var(--color-confirmed)]">
                    {(d.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 pr-4 text-[color:var(--color-text-subtle)] text-xs">
                    {d.provenance.sensorType}
                  </td>
                  <td className="py-2 tabular text-[color:var(--color-text-subtle)] text-xs">
                    {formatTimestamp(d.provenance.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer disclaimer */}
        <p className="text-[10px] text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-3 leading-relaxed">
          AI detections reviewed and confirmed by human analyst. Source:{' '}
          {confirmed[0]?.provenance.sourceFile ?? 'unknown'}.{' '}
          Model: {confirmed[0]?.provenance.modelVersion ?? 'unknown'}.{' '}
          This is a prototype using public overhead imagery (xView / DOTA datasets).
          Production systems would use proprietary sensor data and classification controls.
        </p>
      </div>
    </div>
  );
}
