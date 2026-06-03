# Metrics Slide — Vision Intelligence Analyst

## Headline
**"From 45 minutes to under 5 — with analyst sign-off at every step."**

---

## Primary Metric: Time-to-Insight

| Stage | Manual Process | This Prototype |
|-------|---------------|----------------|
| Image ingestion | 2–5 min | Instant (drag-drop) |
| AI detection + classification | 30–40 min | 5–8 seconds (GPT-4o) |
| Analyst triage + review | 5–10 min | 2–3 min (uncertainty-sorted queue) |
| Sign-off + dissemination | 5 min | 30 seconds (one-click report) |
| **Total** | **~45 min** | **<5 min** |

---

## Detection Performance

| Model | Strength | Weakness |
|-------|----------|----------|
| GPT-4o Vision | Zero-shot flexible labels, classification distribution, natural language notes | Imprecise bounding boxes, misses dense clusters |
| YOLO (Roboflow) | Pixel-accurate localization, fast inference | Fixed class vocabulary, no classification uncertainty |
| **Combined (roadmap)** | YOLO detects → GPT-4o classifies with uncertainty | Best of both — production architecture |

---

## Trust & Analyst Workflow Metrics

**Designed-in trust mechanisms (each one is a measurable signal):**

| Signal | What it measures |
|--------|-----------------|
| AI acceptance rate | % of AI detections analyst accepts without relabeling — target >70% |
| Relabel rate | % changed — high = model needs retraining or prompt tuning |
| Manual annotation rate | % of final detections added by analyst — measures AI miss rate |
| Review completion | % of sessions where analyst reviews all detections before sign-off — target >90% |
| Time-in-review per detection | Measures cognitive load — should drop as analyst builds trust in the model |

---

## Confidence Calibration Quality

The system intentionally surfaces **uncertainty** — not just detections.

- **Green (≥85%):** High-confidence — analyst should accept quickly
- **Amber (60–84%):** Needs review — classification distribution guides the call
- **Red (<60%):** Speculative — analyst decides accept/reject/annotate

**Key design principle:** A near-even classification split (Box Truck 41% / APC 34% / Tank 18%) is more valuable to an analyst than a forced single label. It tells them exactly how much uncertainty to carry into their decision.

---

## What I'd Measure in Production

1. **Time-to-insight per image** (primary KPI — Auric's stated success metric)
2. **Analyst trust score** (post-session survey: "I trust the confidence scores shown" 1–5)
3. **AI precision** — of confirmed detections, % that were correct (analyst accepted without relabeling)
4. **AI recall** — % of objects an analyst later manually annotated that AI missed
5. **Triage efficiency** — time from image load to first sign-off click
6. **Adoption** — % of analysts who complete full review vs abandon mid-flow

---

*All production metrics assume integration with a human-in-the-loop logging system. Every accept/reject/relabel action is a training signal.*
