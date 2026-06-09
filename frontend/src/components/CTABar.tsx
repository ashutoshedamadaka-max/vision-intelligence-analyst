import { useState } from 'react';
import { GitFork, Hammer, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/Modal';

const GITHUB_URL = 'https://github.com/ashutoshedamadaka-max/vision-intelligence-analyst';

/* ─── Architecture diagram — vertical flow ─── */
function ArchDiagram() {
  const nodes = [
    { label: 'Browser', sub: 'React · TypeScript · Vite · Tailwind CSS', accent: '#8b8cf9' },
    { label: 'Vercel', sub: 'Node.js Serverless API — API key kept server-side', accent: '#34d399' },
    { label: 'Roboflow', sub: 'YOLO Aerial Detection Model — open-source', accent: '#f6b73c' },
  ];

  const edges = [
    { down: 'POST /api/analyze  (image as base64)', up: 'Detection JSON  (boxes · confidence · class)' },
    { down: 'Raw base64 image', up: 'Predictions JSON  (x · y · w · h · confidence)' },
  ];

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="font-mono text-[9px] tracking-[0.16em] uppercase mb-4" style={{ color: 'oklch(0.40 0.004 240)' }}>
        System Architecture
      </div>

      <div className="flex gap-4">
        {/* Left: node boxes */}
        <div className="flex flex-col items-stretch gap-0 flex-1">
          {nodes.map((n, i) => (
            <div key={n.label}>
              {/* Node box */}
              <div
                className="rounded-lg border px-4 py-3"
                style={{ borderColor: `${n.accent}45`, background: `${n.accent}0e` }}
              >
                <div className="font-mono text-[12px] font-semibold" style={{ color: n.accent }}>{n.label}</div>
                <div className="font-mono text-[10px] mt-0.5 leading-snug" style={{ color: 'oklch(0.50 0.004 240)' }}>{n.sub}</div>
              </div>

              {/* Connector between nodes */}
              {i < nodes.length - 1 && (
                <div className="flex items-stretch gap-3 py-1">
                  {/* Vertical line */}
                  <div className="flex flex-col items-center" style={{ width: 24, flexShrink: 0 }}>
                    <div className="flex-1 w-px" style={{ background: 'rgba(255,255,255,0.12)', minHeight: 32 }} />
                  </div>
                  {/* Labels */}
                  <div className="flex flex-col justify-around py-1 gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>↓</span>
                      <span className="font-mono text-[10px]" style={{ color: 'oklch(0.50 0.004 240)' }}>{edges[i].down}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>↑</span>
                      <span className="font-mono text-[10px]" style={{ color: 'oklch(0.45 0.004 240)' }}>{edges[i].up}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Bullet list ─── */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#8b8cf9' }} />
          <span className="text-[13.5px] leading-relaxed" style={{ color: 'oklch(0.80 0.005 240)' }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const HOW_I_BUILT: string[] = [
  'Wrote a design spec before writing any code — defined the analyst workflow, data model, and component structure so every decision had a reference point.',
  'Frontend: React + TypeScript + Vite + Tailwind CSS — one component per workflow stage, all state managed in a single App-level machine.',
  'Backend: Node.js serverless functions deployed on Vercel — the model API key lives server-side only, never in the browser.',
  'Tested OpenAI Vision first — got roughly 30% detection on real overhead imagery. Switched to YOLO World, an open-source aerial vehicle detection model, and reached ~75%. Picking the right model for the task mattered more than picking the most capable one.',
  'Detection data is mapped to a structured schema — confidence, classification, bounding box, provenance — so the UI always shows where a detection came from and how certain the model was.',
  'Every analyst action (accept / reject / relabel / draw a missed vehicle) updates the triage queue, canvas, and report instantly — no reloads.',
  'Built in Visual Studio Code using the Claude Code extension as an engineering pair — I owned the product decisions and spec, Claude Code executed the implementation. The app is hosted on Vercel.',
];

const WHAT_I_LEARNT: string[] = [
  'The model struggles with partial or rear-facing vehicles — anything cut off at the frame edge or seen from an unusual angle either gets missed or misclassified. That\'s the gap draw-to-define was built to address: the analyst can box anything the model didn\'t catch.',
  'OpenAI Vision looked like the easy path. It wasn\'t — 30% detection on overhead imagery is not usable. YOLO World, trained specifically on aerial data, gave ~75%. Model selection is a product decision, not just a technical one.',
  'For production accuracy — reliable length, class, and colour output — the model needs training data from all angles, lighting conditions, and occlusion levels. What I built demonstrates the analyst workflow; model accuracy is a separate and significant investment.',
  'The hardest design problem wasn\'t integrating the AI — it was making confidence legible. A number means nothing to an analyst under pressure unless it has visual weight and a clear action attached to it.',
];

const PULSE_STYLE = `
@keyframes ctaPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139,140,249,0); }
  50%       { box-shadow: 0 0 14px 3px rgba(139,140,249,0.35); }
}
.cta-pill { animation: ctaPulse 2.4s ease-in-out infinite; }
.cta-pill:nth-child(2) { animation-delay: 0.8s; }
.cta-pill:nth-child(3) { animation-delay: 1.6s; }
.cta-pill:hover { animation: none; }
`;

/* ─── Main bar ─── */
export function CTABar() {
  const [open, setOpen] = useState<'built' | 'learnt' | null>(null);

  return (
    <>
      <style>{PULSE_STYLE}</style>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(8,8,10,0.85)',
          backdropFilter: 'blur(12px)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => setOpen('built')}
          className="cta-pill flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
          style={{ color: 'oklch(0.65 0.005 240)', borderColor: 'rgba(255,255,255,0.14)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.92 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.65 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
        >
          <Hammer size={12} /> How I Built This
        </button>

        <button
          onClick={() => setOpen('learnt')}
          className="cta-pill flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
          style={{ color: 'oklch(0.65 0.005 240)', borderColor: 'rgba(255,255,255,0.14)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.92 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.65 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
        >
          <Lightbulb size={12} /> What I Learnt
        </button>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-pill flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
          style={{ color: 'oklch(0.65 0.005 240)', borderColor: 'rgba(255,255,255,0.14)', textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.92 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.65 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
        >
          <GitFork size={12} /> GitHub Repo ↗
        </a>
      </div>

      {/* How I Built This modal */}
      {open === 'built' && (
        <Modal title="How I Built This" onClose={() => setOpen(null)}>
          <ArchDiagram />
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }} />
          <Bullets items={HOW_I_BUILT} />
        </Modal>
      )}

      {/* What I Learnt modal */}
      {open === 'learnt' && (
        <Modal title="What I Learnt" onClose={() => setOpen(null)}>
          <Bullets items={WHAT_I_LEARNT} />
        </Modal>
      )}
    </>
  );
}
