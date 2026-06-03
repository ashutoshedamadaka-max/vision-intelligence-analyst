import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploader } from '@/components/ImageUploader';
import { ModelToggle } from '@/components/ModelToggle';
import { WorkflowSteps } from '@/components/WorkflowSteps';
import { DetectionCanvas } from '@/components/DetectionCanvas';
import { DetectionCard } from '@/components/DetectionCard';
import { TriagePanel } from '@/components/TriagePanel';
import { TimeToInsightTimer } from '@/components/TimeToInsightTimer';
import { DisseminationCard } from '@/components/DisseminationCard';
import { ClassificationBanner } from '@/components/ClassificationBanner';
import { GeoStrip } from '@/components/GeoStrip';
import { AggregateSummary } from '@/components/AggregateSummary';
import { FilterBar } from '@/components/FilterBar';
import { analyzeImage } from '@/lib/api';
import type { Detection, DetectionMode, AnalysisResult, BBox, ConfidenceBand } from '@/lib/types';
import { getBand } from '@/lib/types';

type Phase = 'idle' | 'uploading' | 'analyzing' | 'review' | 'complete';

interface AppState {
  phase: Phase;
  file: File | null;
  previewUrl: string | null;
  mode: DetectionMode;
  result: AnalysisResult | null;
  detections: Detection[];
  startedAt: number;
  frozenAt: number | null;
  signOffAt: number | null;
  activeId: string | null;
  error: string | null;
  drawMode: boolean;
  filterClass: string;
  filterBand: ConfidenceBand | null;
  showHeatmap: boolean;
}

const INITIAL: AppState = {
  phase: 'idle', file: null, previewUrl: null, mode: 'openai',
  result: null, detections: [], startedAt: 0, frozenAt: null, signOffAt: null,
  activeId: null, error: null, drawMode: false, filterClass: 'all',
  filterBand: null, showHeatmap: false,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL);
  const setPartial = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

  const handleFileSelect = (file: File, previewUrl: string) => {
    setPartial({ file, previewUrl, phase: 'uploading', error: null });
  };

  const handleAnalyze = async () => {
    if (!state.file) return;
    const startedAt = Date.now();
    setPartial({ phase: 'analyzing', startedAt, error: null });
    try {
      const result = await analyzeImage(state.file, state.mode);
      setPartial({ phase: 'review', result, detections: result.detections, frozenAt: Date.now() });
    } catch (err) {
      setPartial({ phase: 'uploading', error: err instanceof Error ? err.message : 'Analysis failed.' });
    }
  };

  const mutateDetection = useCallback((id: string, patch: Partial<Detection>) => {
    setState((s) => ({
      ...s,
      detections: s.detections.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }, []);

  const handleAccept = (id: string) => mutateDetection(id, { status: 'accepted' });
  const handleReject = (id: string) => mutateDetection(id, { status: 'rejected' });
  const handleRelabel = (id: string, newLabel: string) =>
    mutateDetection(id, { status: 'relabeled', relabeledTo: newLabel, label: newLabel });
  const handleUndo = (id: string) => mutateDetection(id, { status: 'pending', relabeledTo: undefined });

  const handleManualAdd = useCallback((bbox: BBox, label: string, notes: string) => {
    setState((s) => {
      const seq = s.detections.length + 1;
      const newDetection: Detection = {
        id: uuidv4(),
        seq,
        label,
        detectionConfidence: 1.0,
        classification: [{ label, pct: 100 }],
        band: 'hi',
        bbox,
        heading: 0,
        estLength: '~5 m',
        source: 'manual',
        status: 'accepted',
        notes: notes || 'Manually annotated by analyst.',
        provenance: {
          sourceFile: s.file?.name ?? 'unknown',
          timestamp: new Date().toISOString(),
          sensorType: 'Optical',
          modelVersion: 'manual-annotation',
        },
      };
      return {
        ...s,
        detections: [...s.detections, newDetection],
        activeId: newDetection.id,
        drawMode: false,
      };
    });
  }, []);

  const allReviewed = state.detections.length > 0 && state.detections.every((d) => d.status !== 'pending');
  const handleSignOff = () => setPartial({ phase: 'complete', frozenAt: Date.now(), signOffAt: Date.now() });
  const handleReset = () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setState(INITIAL);
  };

  const visibleDetections = state.detections.filter((d) => {
    if (state.filterClass !== 'all' && d.label !== state.filterClass) return false;
    if (state.filterBand && d.band !== state.filterBand) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.08 0.005 240)', color: 'oklch(0.92 0.005 240)' }}>
      <ClassificationBanner />

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl">Vision Intelligence Analyst</h1>
            <p className="text-[13px] mt-1.5" style={{ color: 'oklch(0.45 0.004 240)' }}>
              Fine-grained vehicle detection & classification — human review required
            </p>
          </div>
          {(state.phase === 'analyzing' || state.phase === 'review' || state.phase === 'complete') && (
            <TimeToInsightTimer startedAt={state.startedAt} frozenAt={state.frozenAt} phase={state.phase} />
          )}
        </div>

        {/* Workflow stepper */}
        <WorkflowSteps phase={state.phase} mode={state.mode} />

        {/* Error banner */}
        {state.error && (
          <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: '#fb6a78', background: 'rgba(251,106,120,0.1)', color: '#fb6a78' }}>
            {state.error}
          </div>
        )}

        {/* ── PHASE: idle / uploading ── */}
        {(state.phase === 'idle' || state.phase === 'uploading') && (
          <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
            <ImageUploader onFileSelect={handleFileSelect} />
            <ModelToggle mode={state.mode} onChange={(m) => setPartial({ mode: m })} disabled={state.phase === 'idle'} />
            {state.phase === 'uploading' && (
              <button
                onClick={handleAnalyze}
                className="w-full py-3 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
                style={{ background: 'oklch(0.72 0.18 280)', color: 'white' }}
              >
                Analyze Image
              </button>
            )}
          </div>
        )}

        {/* ── PHASE: analyzing ── */}
        {state.phase === 'analyzing' && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'oklch(0.72 0.18 280)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'oklch(0.60 0.005 240)' }}>
              Running {state.mode === 'yolo' ? 'YOLO vehicle detection' : 'GPT-4o vision analysis'}…
            </p>
          </div>
        )}

        {/* ── PHASE: review ── */}
        {state.phase === 'review' && state.previewUrl && (
          <div className="flex flex-col gap-4">
            <GeoStrip
              filename={state.file?.name}
              capturedAt={state.result?.detections[0]?.provenance.timestamp
                ? new Date(state.result.detections[0].provenance.timestamp)
                    .toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')
                : undefined}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              {/* Image + controls */}
              <div>
                {/* Image toolbar */}
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color: 'oklch(0.45 0.004 240)' }}>
                    FRAME · {state.detections.length} DETECTIONS
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPartial({ drawMode: !state.drawMode })}
                      className="font-mono text-[11px] border rounded-md px-3 py-1 transition-all"
                      style={{
                        borderColor: state.drawMode ? 'oklch(0.72 0.18 280)' : 'rgba(255,255,255,0.1)',
                        color: state.drawMode ? 'oklch(0.72 0.18 280)' : 'oklch(0.45 0.004 240)',
                        background: state.drawMode ? 'oklch(0.72 0.18 280 / 0.15)' : 'transparent',
                      }}
                    >
                      {state.drawMode ? '✕ Cancel Draw' : '+ Draw Detection'}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                  <DetectionCanvas
                    imageUrl={state.previewUrl}
                    detections={state.detections}
                    activeId={state.activeId}
                    drawMode={state.drawMode}
                    showHeatmap={state.showHeatmap}
                    filterClass={state.filterClass}
                    filterBand={state.filterBand}
                    onBoxClick={(id) => setPartial({ activeId: id })}
                    onManualAdd={handleManualAdd}
                  />
                </div>

                <AggregateSummary detections={state.detections} />

                <FilterBar
                  filterClass={state.filterClass}
                  filterBand={state.filterBand}
                  showHeatmap={state.showHeatmap}
                  onClassChange={(cls) => setPartial({ filterClass: cls })}
                  onBandChange={(band) => setPartial({ filterBand: band })}
                  onHeatmapToggle={() => setPartial({ showHeatmap: !state.showHeatmap })}
                />
              </div>

              {/* Triage queue */}
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)', maxHeight: 560 }}>
                <TriagePanel
                  detections={state.detections}
                  activeId={state.activeId}
                  onSelect={(id) => setPartial({ activeId: id })}
                />
              </div>
            </div>

            {/* Detection cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl">
                  Detections ({state.detections.length})
                </h2>
                {state.result && (
                  <span className="font-mono text-[11px] tabular" style={{ color: 'oklch(0.45 0.004 240)' }}>
                    Processed in {state.result.processingTimeMs}ms · gpt-4o-vision-v1
                  </span>
                )}
              </div>

              {state.detections.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <p className="text-sm text-center" style={{ color: 'oklch(0.45 0.004 240)' }}>
                    No objects detected. Try a different image or enable Draw mode to annotate manually.
                  </p>
                  <button onClick={handleReset} className="px-6 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgba(255,255,255,0.09)', color: 'oklch(0.60 0.005 240)' }}>
                    Upload a different image
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {state.detections.map((d) => (
                    <DetectionCard
                      key={d.id}
                      detection={d}
                      isActive={d.id === state.activeId}
                      dimmed={
                        (state.filterClass !== 'all' && d.label !== state.filterClass) ||
                        (state.filterBand !== null && d.band !== state.filterBand)
                      }
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onRelabel={handleRelabel}
                      onUndo={handleUndo}
                      onClick={(id) => setPartial({ activeId: id })}
                    />
                  ))}
                </div>
              )}
            </div>

            {allReviewed && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleSignOff}
                  className="px-8 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  style={{ background: '#34d399', color: '#05130d' }}
                >
                  Sign Off — Generate Intelligence Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PHASE: complete ── */}
        {state.phase === 'complete' && state.result && (
          <DisseminationCard
            detections={state.detections}
            analysisId={state.result.analysisId}
            timeToInsightMs={(state.signOffAt ?? state.frozenAt)! - state.startedAt}
            signOffAt={new Date((state.signOffAt ?? state.frozenAt)!).toISOString()}
            mode={state.mode}
            onReset={handleReset}
          />
        )}

        {/* Footnote */}
        {state.phase === 'review' && (
          <p className="font-mono text-[11px] leading-relaxed max-w-3xl" style={{ color: 'oklch(0.35 0.004 240)' }}>
            AI detections require human confirmation before dissemination. Detection confidence (object present)
            is reported separately from classification confidence (object type). Prototype on public overhead imagery
            (xView / DOTA); production would use proprietary sensor data, calibrated GSD, and access controls.
          </p>
        )}
      </div>

      <ClassificationBanner />
    </div>
  );
}
