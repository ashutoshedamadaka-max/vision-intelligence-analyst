import { useState, useCallback } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { ModelToggle } from '@/components/ModelToggle';
import { WorkflowSteps } from '@/components/WorkflowSteps';
import { DetectionCanvas } from '@/components/DetectionCanvas';
import { DetectionCard } from '@/components/DetectionCard';
import { TriagePanel } from '@/components/TriagePanel';
import { TimeToInsightTimer } from '@/components/TimeToInsightTimer';
import { DisseminationCard } from '@/components/DisseminationCard';
import { analyzeImage } from '@/lib/api';
import type { Detection, DetectionMode, AnalysisResult } from '@/lib/types';

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
  activeId: string | null;
  error: string | null;
  signOffAt: number | null;
}

const INITIAL: AppState = {
  phase: 'idle',
  file: null,
  previewUrl: null,
  mode: 'openai',
  result: null,
  detections: [],
  startedAt: 0,
  frozenAt: null,
  activeId: null,
  error: null,
  signOffAt: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL);

  const setPartial = (patch: Partial<AppState>) =>
    setState((s) => ({ ...s, ...patch }));

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
      setPartial({
        phase: 'uploading',
        error: err instanceof Error ? err.message : 'Analysis failed. Please try again.',
      });
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
    mutateDetection(id, { status: 'relabeled', relabeledTo: newLabel });
  const handleUndo = (id: string) => mutateDetection(id, { status: 'pending', relabeledTo: undefined });

  const allReviewed =
    state.detections.length > 0 && state.detections.every((d) => d.status !== 'pending');

  const handleSignOff = () => setPartial({ phase: 'complete', frozenAt: Date.now(), signOffAt: Date.now() });

  const handleReset = () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setState(INITIAL);
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-surface-0)] text-[color:var(--color-text)]">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl text-[color:var(--color-text)]">
              Vision Intelligence Analyst
            </h1>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              AI-assisted overhead imagery analysis — human review required
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
          <div className="rounded border border-[color:var(--color-threat)] bg-[color:var(--color-threat-dim)] px-4 py-3 text-sm text-[color:var(--color-threat)]">
            {state.error}
          </div>
        )}

        {/* ── PHASE: idle / uploading ── */}
        {(state.phase === 'idle' || state.phase === 'uploading') && (
          <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
            <ImageUploader onFileSelect={handleFileSelect} />
            <ModelToggle
              mode={state.mode}
              onChange={(m) => setPartial({ mode: m })}
              disabled={state.phase === 'idle'}
            />
            {state.phase === 'uploading' && (
              <button
                onClick={handleAnalyze}
                className="w-full py-3 rounded-lg font-medium text-sm transition-opacity hover:opacity-90 text-[color:var(--color-surface-0)] bg-[color:var(--color-ai)]"
              >
                Analyze Image
              </button>
            )}
          </div>
        )}

        {/* ── PHASE: analyzing ── */}
        {state.phase === 'analyzing' && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-ai)', borderTopColor: 'transparent' }} />
            <p className="text-sm text-[color:var(--color-text-subtle)]">
              Running {state.mode === 'yolo' ? 'YOLO aerial detection' : 'OpenAI vision analysis'}…
            </p>
          </div>
        )}

        {/* ── PHASE: review ── */}
        {state.phase === 'review' && state.previewUrl && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <DetectionCanvas
                imageUrl={state.previewUrl}
                detections={state.detections}
                activeId={state.activeId}
                onBoxClick={(id) => setPartial({ activeId: id })}
              />
              <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] overflow-hidden max-h-[480px]">
                <TriagePanel
                  detections={state.detections}
                  activeId={state.activeId}
                  onSelect={(id) => setPartial({ activeId: id })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-[color:var(--color-text)]">
                  Detections ({state.detections.length})
                </h2>
                {state.result && (
                  <span className="text-xs text-[color:var(--color-muted)] tabular">
                    Processed in {state.result.processingTimeMs}ms
                  </span>
                )}
              </div>

              {state.detections.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <p className="text-sm text-[color:var(--color-muted)] text-center">
                    No objects detected. Try a different image or switch to YOLO mode.
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 rounded-lg text-sm font-medium border border-[color:var(--color-border)] text-[color:var(--color-text-subtle)] hover:opacity-80 transition-opacity"
                  >
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
                  className="px-8 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity text-[color:var(--color-surface-0)] bg-[color:var(--color-confirmed)]"
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

      </div>
    </div>
  );
}
