# Project Context — Vision Intelligence Analyst Workflow (Portfolio Prototype)

## Why this project exists
This is a **portfolio piece** to land a **Product Manager** interview at **Auric AI**, a defense
startup building an AI vision-intelligence platform that detects/classifies high-value objects
(vehicles, aircraft, ships, etc.) in satellite and drone imagery for military analysts.

The goal is NOT to build the world's best object detector. It is to demonstrate **product-manager
craft**: workflow design, trust/usability under pressure, and turning raw AI detections into
*intelligence an analyst can trust within minutes*. The detection model is just one node in a
larger workflow — the workflow and the trust layer are the hero.

> One-line thesis to keep in mind: "I designed a trustworthy analyst experience around an
> imperfect model" beats "I trained an accurate model."

## The product: an analyst workflow tool
Build a working web prototype that walks through the analyst journey end-to-end (this is Auric's
own stated pipeline):

    image ingestion → preprocessing → AI detection → quality review → database → dissemination

### Hero features (these are what differentiate the demo)
- **Confidence + uncertainty made visible** — not just "Tank 94%"; low-confidence detections are
  flagged for human review rather than presented as fact.
- **Human-in-the-loop verification** — analyst can accept / reject / relabel each detection before
  it becomes "intelligence." No black box.
- **Provenance per detection** — source image, timestamp, sensor type, model version. Trust =
  traceability.
- **Time-to-insight counter** — surface the metric Auric explicitly lists as a success measure.
- **Triage view** — sort detections by priority / confidence so an overwhelmed analyst sees what
  matters first.

## Tech stack
- **Editor:** VS Code + Claude Code.
- **Detection ("intelligence") layer — pick one:**
  1. *Demo-credible, easiest:* pre-trained aerial detection model (e.g. DOTA-trained YOLO weights)
     OR pre-annotated dataset images, so detections are real without training anything.
  2. *API path:* OpenAI vision API (gpt-4o-mini). Fast to ship; weaker on small objects in
     overhead imagery — acceptable for a demo, but never claim accuracy it doesn't have.
- **Backend:** Node.js + Express proxy. The OpenAI API key lives **server-side only**, loaded from
  a `.env` file (which must be in `.gitignore`). Never put the key in frontend code.
- **Frontend:** Start with plain HTML/JS for speed; move to React only if the app grows.

## Data / imagery
Use **public overhead-imagery research datasets** — never anything sensitive or classified:
- **xView** (60 overhead classes incl. vehicles, aircraft, ships, infrastructure — closest fit)
- **DOTA** (aerial: planes, ships, vehicles, storage tanks, harbors)
- **DIOR / FAIR1M / RarePlanes** (more aerial detection sets)

For the demo, use honest stand-in classes (aircraft / ships / vehicles) for "high-value military
objects" and **say so in the UI**: "Prototype trained on public overhead datasets; production
would use proprietary data." Being upfront is itself a trust-design signal.

## Design principles to carry over (established house style)
- **Data honesty above all:** never show a claim the data can't support; degrade gracefully to
  "low confidence / needs review" instead of overclaiming. This is the core philosophy.
- **Visual weight matches required action:** the louder a UI element, the more it should demand the
  analyst act. A flagged low-confidence detection earns more weight than a routine confirmed one.
- **Provenance labels** (exact / estimated / manual-equivalent) for every surfaced fact.
- **Typography:** Instrument Serif for headlines/key numbers; Inter for UI copy; tabular numerals
  for any aligned figures.
- **Detailing:** 0.5px borders with low-opacity fills; subtle radial glows for depth.
- **Color semantics — RE-MAP for this domain.** (Finance meanings like teal=savings don't apply.)
  Define defense-appropriate semantics, e.g. confidence/threat tiers: calm/neutral for
  confirmed-low-priority, amber for "needs review / uncertain," red for high-priority/high-threat.
  Keep one accent reserved for AI-generated content so analysts always know what came from the model.

## Deliverables (the full package that wins the interview)
1. **Interactive prototype** (this build) — the analyst workflow above, demoable in a browser.
2. **Mini-PRD (1–2 pages)** — problem, analyst persona, MVP scope, and explicitly what was cut and
   why (Auric values ruthless must-have vs nice-to-have separation).
3. **Metrics slide** — time-to-insight, detection precision/recall, analyst trust, adoption.
4. **~90-second Loom** walking through the analyst journey.

## Suggested build order
1. Scaffold project: Express backend with one `/analyze` endpoint + `.env` + `.gitignore`.
2. Static frontend: upload/drag-drop an overhead image, show preview.
3. Wire detection layer → return detections as JSON (label, confidence, bounding box, provenance).
4. Build the **review UI**: render boxes over the image, confidence states, accept/reject/relabel.
5. Add triage view + time-to-insight counter.
6. Add a "dissemination-ready" output (clean summary card / export).
7. Polish to house style, then record the Loom.

## First task for this session
Scaffold the project (step 1–2 above): an Express backend with a `/analyze` POST endpoint that
accepts an uploaded image and returns mock detections as JSON for now, plus a simple frontend that
uploads an image and shows a preview. We'll wire the real detection layer in next.
