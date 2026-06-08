import { useState } from 'react';
import { GitFork, Hammer, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/Modal';

const GITHUB_URL = 'https://github.com/ashutoshedamadaka-max/vision-intelligence-analyst';

/* ─── Architecture diagram ─── */
function ArchDiagram() {
  const box = (label: string, sub: string, accent?: string) => (
    <div
      className="flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-center"
      style={{
        borderColor: accent ? `${accent}40` : 'rgba(255,255,255,0.1)',
        background: accent ? `${accent}0d` : 'rgba(255,255,255,0.03)',
        minWidth: 130,
      }}
    >
      <span className="font-mono text-[11px] font-semibold" style={{ color: accent ?? 'oklch(0.92 0.005 240)' }}>
        {label}
      </span>
      <span className="font-mono text-[10px] mt-0.5 leading-tight" style={{ color: 'oklch(0.45 0.004 240)' }}>
        {sub}
      </span>
    </div>
  );

  const arrow = (label: string) => (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <span className="font-mono text-[9px]" style={{ color: 'oklch(0.40 0.004 240)' }}>{label}</span>
      <div className="flex items-center gap-0.5">
        <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.18)' }} />
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>▶</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="font-mono text-[9px] tracking-[0.16em] uppercase mb-3" style={{ color: 'oklch(0.45 0.004 240)' }}>
        System Architecture
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {box('Browser', 'React · TS · Vite\nTailwind CSS', '#8b8cf9')}
        {arrow('POST /api/analyze')}
        {box('Vercel', 'Node.js\nServerless API', '#34d399')}
        {arrow('base64 image')}
        {box('Roboflow', 'YOLO Aerial\nopen-source', '#f6b73c')}
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
        <div style={{ minWidth: 130 }} />
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-0.5">
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>◀</span>
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <span className="font-mono text-[9px]" style={{ color: 'oklch(0.40 0.004 240)' }}>detection JSON</span>
        </div>
        <div style={{ minWidth: 130 }} />
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-0.5">
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>◀</span>
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <span className="font-mono text-[9px]" style={{ color: 'oklch(0.40 0.004 240)' }}>predictions JSON</span>
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
  'Built using Claude Code as an engineering pair — I owned the product decisions and spec; Claude Code executed the implementation.',
];

const WHAT_I_LEARNT: string[] = [
  'The model struggles with partial or rear-facing vehicles — anything cut off at the frame edge or seen from an unusual angle either gets missed or misclassified. That\'s the gap draw-to-define was built to address: the analyst can box anything the model didn\'t catch.',
  'OpenAI Vision looked like the easy path. It wasn\'t — 30% detection on overhead imagery is not usable. YOLO World, trained specifically on aerial data, gave ~75%. Model selection is a product decision, not just a technical one.',
  'For production accuracy — reliable length, class, and colour output — the model needs training data from all angles, lighting conditions, and occlusion levels. What I built demonstrates the analyst workflow; model accuracy is a separate and significant investment.',
  'The hardest design problem wasn\'t integrating the AI — it was making confidence legible. A number means nothing to an analyst under pressure unless it has visual weight and a clear action attached to it.',
];

/* ─── Main bar ─── */
export function CTABar() {
  const [open, setOpen] = useState<'built' | 'learnt' | null>(null);

  return (
    <>
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
          className="flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
          style={{ color: 'oklch(0.65 0.005 240)', borderColor: 'rgba(255,255,255,0.14)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.92 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.65 0.005 240)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
        >
          <Hammer size={12} /> How I Built This
        </button>

        <button
          onClick={() => setOpen('learnt')}
          className="flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
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
          className="flex items-center gap-2 font-mono text-[11px] tracking-wide border rounded-full px-4 py-2 transition-all"
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
