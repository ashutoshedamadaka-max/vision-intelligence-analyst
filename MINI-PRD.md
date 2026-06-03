# Mini-PRD — Vision Intelligence Analyst
**Author:** Ashutosh Edamadaka | **Date:** June 2026 | **Status:** Prototype

---

## Problem

Military and defense analysts review hundreds of overhead images per shift. Their primary question is always the same: **what is moving, what is it, and how sure are you?**

Today's tools give them a binary answer — detected / not detected. That's not intelligence. A "truck" at 61% confidence with a near-even split between Box Truck (41%), APC (34%), and Tank (18%) is a completely different operational situation than a "sedan" at 94% confidence. The current generation of tools collapses that distinction into a single number, forcing analysts to manually second-guess every output before they can act.

The result: high-value intelligence sits in a review queue for hours instead of minutes. Vehicles — the most time-sensitive asset class because they move — lose their intelligence value while the analyst is still verifying them.

---

## Analyst Persona

**"Alex" — Forward ISR Analyst**
- Reviews 200–400 detections per shift across multiple image collections
- Has 3–8 minutes per image before the next collection arrives
- Must sign off on detections before they enter the targeting database
- Operates under pressure; overclaiming is as dangerous as missing a detection
- Does not trust black-box AI — needs to understand *why* a detection was made

**Core need:** Triage fast, verify confidently, disseminate without doubt.

---

## Product Thesis

> Vehicles are the mobile assets. Mobility makes intelligence perishable. The headline metric is time-to-insight in minutes, not model accuracy in percentage points.

This product is not about building a better detector. It is about building a **trustworthy analyst workflow** around an imperfect detector. The AI is one node. The workflow — triage, verification, provenance, sign-off — is the product.

---

## What I Built (MVP Scope)

A full-stack analyst workflow prototype deployed at [vision-intelligence-analyst.vercel.app]:

| Feature | Why it's in MVP |
|---------|----------------|
| **Dual confidence per detection** — detection confidence (is it there?) separated from classification distribution (what is it?) | Core thesis — this IS the classification product |
| **Top-3 classification distribution** — "Box Truck 41% / APC 34% / Tank 18%" not just "Truck 71%" | Gives analyst the raw signal, not a collapsed label |
| **Uncertainty-sorted triage queue** — most ambiguous detections surface first | Analysts are time-constrained; wrong ordering wastes minutes |
| **Human-in-the-loop review** — accept / reject / relabel before anything enters the record | Non-negotiable trust layer; no black-box dissemination |
| **Manual annotation (draw mode)** — analyst can add missed detections | AI is imperfect; analyst is the ground truth |
| **Provenance per detection** — source file, model version, timestamp, sensor type | Trust = traceability; every confirmed detection is auditable |
| **Time-to-insight counter** — measures upload → sign-off in real time | Auric's stated success metric; making it visible creates accountability |
| **Confidence color system** — green ≥85%, amber 60–84%, red <60% | Visual weight scales with how much review a detection demands |
| **Filters + heatmap density overlay** | Helps analysts focus on spatial clusters and confidence tiers |
| **Intelligence Report + Export** | Dissemination-ready output with chain of custody |

**Tech stack:** React + TypeScript (Vite), Node.js serverless API (Vercel), GPT-4o Vision for flexible zero-shot classification, Roboflow YOLO for precise bounding-box detection. Deployed on Vercel with no-terminal, shareable URL.

---

## What Was Cut and Why

| Cut | Reason |
|-----|--------|
| Training a custom model | A PM prototype does not need SOTA accuracy; it needs a credible workflow. GPT-4o is good enough to demonstrate the UX. A real deployment would swap the model node. |
| Multi-image change detection | High value, but requires a persistence layer and image registration. Adds 2–3 weeks. Not in MVP. |
| Role-based access / auth | Single-analyst demo. Real deployment needs auth; not the PM's job to build it for a prototype. |
| SAR / IR imagery support | Optical only. Sensor-specific preprocessing is an engineering sprint, not a PM decision for MVP. |
| Mobile / tablet UI | Analysts work at workstations. Responsive design is a follow-on, not MVP. |
| Batch processing / queuing | Single-image flow demonstrates the workflow. Batch is a scaling concern post-validation. |

**Prioritization framework:** If the feature demonstrates the core workflow loop (upload → classify → review → sign-off) or builds analyst trust, it's in. If it's infrastructure, scale, or edge-case handling, it's out until the workflow is validated.

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Time-to-insight | ~45 min (manual review) | <5 min |
| Analyst review completion rate | — | >90% of detections reviewed before sign-off |
| AI acceptance rate | — | >70% of AI detections accepted without relabeling |
| False positive rate surfaced to analyst | — | <15% of confirmed detections are wrong |
| Analyst trust score (survey) | — | >4/5 "I trust the confidence scores shown" |

---

## What I Learned Building This

1. **Workflow beats accuracy.** GPT-4o misses detections and produces imprecise bounding boxes. That's fine — the triage queue, manual annotation, and sign-off flow make it usable anyway. A 70% accurate model with a great analyst experience outperforms a 95% model with a bad one.

2. **Dual confidence is the product.** The single most impactful design decision was separating detection confidence from classification distribution. That one change transformed "AI bounding box tool" into "classification intelligence product."

3. **Honesty is a feature.** Every confidence disclaimer, every "estimated" label, every model version in provenance — these aren't caveats. They're what makes an analyst trust the system enough to sign off in under 5 minutes.

4. **LLMs are bad at precise localization.** GPT-4o groups vehicles, misses small objects, and produces approximate pixel coordinates. YOLO is far better for localization. The right architecture uses YOLO for detection + LLM for classification reasoning — not one or the other.

---

*Prototype uses public overhead imagery (xView / DOTA datasets). Production would use proprietary sensor data, calibrated GSD, and access-controlled dissemination pathways.*
