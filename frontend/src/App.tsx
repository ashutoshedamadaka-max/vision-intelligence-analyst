import { useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploader } from '@/components/ImageUploader';
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
import { DetectionSequence } from '@/components/DetectionSequence';
import type { Detection, DetectionMode, AnalysisResult, BBox, ConfidenceBand } from '@/lib/types';

type Phase = 'idle' | 'uploading' | 'analyzing' | 'review' | 'complete';

interface AppState {
  phase: Phase;
  file: File | null;
  previewUrl: string | null;
  mode: DetectionMode;
  result: AnalysisResult | null;
  sequenceResult: AnalysisResult | null; // API result received but not yet proceeded to review
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
  showBoxes: boolean;
}

const INITIAL: AppState = {
  phase: 'idle', file: null, previewUrl: null, mode: 'yolo',
  result: null, sequenceResult: null, detections: [],
  startedAt: 0, frozenAt: null, signOffAt: null,
  activeId: null, error: null, drawMode: false, filterClass: 'all',
  filterBand: null, showHeatmap: false, showBoxes: true,
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
    setPartial({ phase: 'analyzing', startedAt, error: null, sequenceResult: null });
    try {
      const result = await analyzeImage(state.file, 'yolo');
      // Don't switch phase yet — pass result to DetectionSequence; user proceeds manually
      setPartial({ sequenceResult: result, frozenAt: Date.now() });
    } catch (err) {
      setPartial({ phase: 'uploading', error: err instanceof Error ? err.message : 'Analysis failed.' });
    }
  };

  const handleProceedToReview = useCallback((result: AnalysisResult) => {
    setPartial({ phase: 'review', result, detections: result.detections });
  }, []);

  const mutateDetection = useCallback((id: string, patch: Partial<Detection>) => {
    setState((s) => ({
      ...s,
      detections: s.detections.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }, []);

  const handleAccept = (id: string) => mutateDetection(id, { status: 'confirmed' });
  const handleReject = (id: string) => mutateDetection(id, { status: 'rejected' });
  const handleRelabel = (id: string, newLabel: string) =>
    mutateDetection(id, { status: 'relabeled', relabeledTo: newLabel, label: newLabel });
  const handleUndo = (id: string) => mutateDetection(id, { status: 'pending', relabeledTo: undefined });

  const handleManualAdd = useCallback((bbox: BBox, label: string, _notes: string) => {
    setState((s) => {
      const seq = s.detections.length + 1;
      const GSD_M = 0.31;
      const newDetection: Detection = {
        id: uuidv4(),
        seq,
        label,
        detectionConfidence: 1.0,
        classification: [{ label, pct: 100 }],
        band: 'man',
        bbox,
        heading: null,
        estLength: `~${(bbox.w * GSD_M).toFixed(1)} m`,
        source: 'manual',
        manual: true,
        status: 'confirmed',
        notes: 'Defined by analyst — missed by model. Provenance: manual.',
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

  const allReviewed = state.detections.length > 0 && state.detections.every((d) => d.manual || d.status !== 'pending');

  // Unique, sorted class labels derived from current detections (excludes manual)
  const detectionClasses = useMemo(() => {
    const labels = new Set(state.detections.filter(d => !d.manual).map(d => d.relabeledTo ?? d.label));
    return [...labels].sort();
  }, [state.detections]);
  const handleSignOff = () => setPartial({ phase: 'complete', frozenAt: Date.now(), signOffAt: Date.now() });
  const handleReset = () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setState(INITIAL);
  };


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
          <div className="flex items-center gap-3">
            {state.phase !== 'idle' && (
              <button
                onClick={handleReset}
                title="Start over"
                className="flex items-center gap-1.5 font-mono text-[11px] border rounded px-2.5 py-1.5 transition-colors"
                style={{ color: 'oklch(0.45 0.004 240)', borderColor: 'rgba(255,255,255,0.09)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.92 0.005 240)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.45 0.004 240)')}
              >
                <RefreshCw size={12} /> Reset
              </button>
            )}
            {(state.phase === 'analyzing' || state.phase === 'review' || state.phase === 'complete') && (
              <TimeToInsightTimer startedAt={state.startedAt} frozenAt={state.frozenAt} phase={state.phase} />
            )}
          </div>
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
        {state.phase === 'analyzing' && state.previewUrl && (
          <DetectionSequence
            previewUrl={state.previewUrl}
            result={state.sequenceResult}
            startedAt={state.startedAt}
            onProceed={handleProceedToReview}
            onReset={handleReset}
          />
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
                {/* Image card */}
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                  {/* Card header / toolbar */}
                  <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color: 'oklch(0.45 0.004 240)' }}>
                      FRAME · {state.detections.length} DETECTIONS
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPartial({ drawMode: !state.drawMode })}
                        className="font-mono text-[10.5px] border rounded px-2.5 py-1 transition-all"
                        style={{
                          borderColor: state.drawMode ? '#38bdf8' : 'rgba(255,255,255,0.09)',
                          color: state.drawMode ? '#38bdf8' : 'oklch(0.45 0.004 240)',
                          background: state.drawMode ? 'rgba(56,189,248,0.12)' : 'transparent',
                        }}
                      >
                        {state.drawMode ? '✕ exit draw' : '⊕ Define vehicle'}
                      </button>
                      <button
                        onClick={() => setPartial({ showHeatmap: !state.showHeatmap })}
                        className="font-mono text-[10.5px] border rounded px-2.5 py-1 transition-all"
                        style={{
                          borderColor: state.showHeatmap ? 'oklch(0.72 0.18 280)' : 'rgba(255,255,255,0.09)',
                          color: state.showHeatmap ? 'oklch(0.72 0.18 280)' : 'oklch(0.45 0.004 240)',
                          background: state.showHeatmap ? 'oklch(0.72 0.18 280 / 0.14)' : 'transparent',
                        }}
                      >
                        ◦ Density
                      </button>
                      <button
                        onClick={() => setPartial({ showBoxes: !state.showBoxes })}
                        className="font-mono text-[10.5px] border rounded px-2.5 py-1 transition-all"
                        style={{
                          borderColor: state.showBoxes ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)',
                          color: state.showBoxes ? 'oklch(0.92 0.005 240)' : 'oklch(0.45 0.004 240)',
                          background: state.showBoxes ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                      >
                        ■ Boxes
                      </button>
                    </div>
                  </div>

                  {/* Draw-mode banner */}
                  {state.drawMode && (
                    <div className="flex items-center gap-2 px-3.5 py-2 font-mono text-[11px]" style={{ background: 'rgba(56,189,248,0.12)', borderBottom: '0.5px solid rgba(56,189,248,0.35)', color: '#bfe9ff', letterSpacing: '0.04em' }}>
                      DRAW MODE · drag a box over a missed vehicle, then assign a class
                      <button
                        onClick={() => setPartial({ drawMode: false })}
                        className="ml-auto opacity-70 transition-opacity hover:opacity-100"
                        style={{ color: '#bfe9ff' }}
                      >
                        ✕ exit
                      </button>
                    </div>
                  )}

                  <DetectionCanvas
                    imageUrl={state.previewUrl}
                    detections={state.detections}
                    activeId={state.activeId}
                    drawMode={state.drawMode}
                    showHeatmap={state.showHeatmap}
                    showBoxes={state.showBoxes}
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
                  classes={detectionClasses}
                  onClassChange={(cls) => setPartial({ filterClass: cls })}
                  onBandChange={(band) => setPartial({ filterBand: band })}
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
                    Processed in {state.result.processingTimeMs}ms · yolo-world-aerial · open-source
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
                        (state.filterClass !== 'all' && (d.relabeledTo ?? d.label) !== state.filterClass) ||
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
