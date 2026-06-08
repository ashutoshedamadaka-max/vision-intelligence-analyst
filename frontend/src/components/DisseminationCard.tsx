import { Printer, RefreshCw } from 'lucide-react';
import type { Detection } from '@/lib/types';

interface Props {
  detections: Detection[];
  analysisId: string;
  timeToInsightMs: number;
  signOffAt: string;
  onReset: () => void;
}

function formatMs(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(iso: string): string {
  try { return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'); }
  catch { return iso; }
}

export function DisseminationCard({ detections, analysisId, timeToInsightMs, signOffAt, onReset }: Props) {
  const confirmed = detections.filter((d) => d.status === 'confirmed' || d.status === 'relabeled' || d.manual);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors"
          style={{ borderColor: 'rgba(255,255,255,0.09)', color: 'oklch(0.45 0.004 240)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
        >
          <RefreshCw size={12} /> Start New Analysis
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors"
          style={{ borderColor: 'rgba(52,211,153,0.4)', color: '#34d399' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,211,153,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Printer size={12} /> Export Report
        </button>
      </div>

      <div
        id="dissemination-root"
        className="rounded-lg border p-6 flex flex-col gap-5"
        style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.09)' }}
      >
        <div className="flex items-start justify-between pb-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.09)' }}>
          <div>
            <h1 className="font-serif text-xl tracking-[0.2em] uppercase">Intelligence Report</h1>
            <p className="font-mono text-xs mt-1" style={{ color: 'oklch(0.45 0.004 240)' }}>{analysisId}</p>
            <p className="font-mono text-xs" style={{ color: 'oklch(0.45 0.004 240)' }}>
              Analyst sign-off: {formatTimestamp(signOffAt)}
            </p>
            <p className="font-mono text-xs" style={{ color: 'oklch(0.45 0.004 240)' }}>
              Model: yolo-world-aerial · open-source
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif tabular text-3xl" style={{ color: '#34d399' }}>
              {formatMs(timeToInsightMs)}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'oklch(0.45 0.004 240)' }}>
              Time to Insight
            </p>
          </div>
        </div>

        {confirmed.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'oklch(0.45 0.004 240)' }}>
            No detections confirmed in this analysis.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.09)' }}>
                {['#', 'Vehicle', 'Det. Conf.', 'Top Class', 'Length', 'Sensor', 'Timestamp', 'Source'].map((h) => (
                  <th key={h} className="text-left font-mono text-[10px] uppercase tracking-widest pb-2 pr-3 font-medium" style={{ color: 'oklch(0.45 0.004 240)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confirmed.map((d, i) => (
                <tr key={d.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'oklch(0.45 0.004 240)' }}>{d.seq}</td>
                  <td className="py-2 pr-3 font-medium">
                    {d.relabeledTo ?? d.label}
                    {d.status === 'relabeled' && <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'oklch(0.72 0.18 280)' }}>(relabeled)</span>}
                    {d.source === 'manual' && <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'oklch(0.72 0.18 280)' }}>(manual)</span>}
                  </td>
                  <td className="py-2 pr-3 font-mono tabular" style={{ color: '#34d399' }}>
                    {Math.round(d.detectionConfidence * 100)}%
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'oklch(0.60 0.005 240)' }}>
                    {d.classification[0]?.label ?? '—'} {d.classification[0]?.pct ?? ''}%
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'oklch(0.60 0.005 240)' }}>{d.estLength}</td>
                  <td className="py-2 pr-3 text-xs" style={{ color: 'oklch(0.60 0.005 240)' }}>{d.provenance.sensorType}</td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'oklch(0.60 0.005 240)' }}>
                    {formatTimestamp(d.provenance.timestamp)}
                  </td>
                  <td className="py-2 font-mono text-xs" style={{ color: d.source === 'manual' ? 'oklch(0.72 0.18 280)' : 'oklch(0.45 0.004 240)' }}>
                    {d.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="font-mono text-[10px] leading-relaxed pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.09)', color: 'oklch(0.45 0.004 240)' }}>
          AI detections reviewed and confirmed by human analyst. Prototype uses public overhead imagery (xView / DOTA). Production would use proprietary sensor data and classification controls. Model: {confirmed[0]?.provenance.modelVersion ?? 'unknown'}.
        </p>
      </div>
    </div>
  );
}
