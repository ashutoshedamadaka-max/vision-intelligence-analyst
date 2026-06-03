# Loom Script — Vision Intelligence Analyst (~90 seconds)

**URL to open:** your live Vercel deployment
**Have ready:** a clean satellite/aerial image of an airport or port (no Google Maps labels)

---

## Before you record

- Open the live URL in a clean browser window, full screen
- Have the aerial image ready to drag in
- Keep DevTools closed
- Record at 1080p

---

## Script (speak naturally — these are talking points, not word-for-word)

---

**[0:00–0:10] — Hook (show the homepage)**

> "Vehicles are the mobile assets in overhead intelligence. They move — which means the intelligence they carry expires fast. I built this prototype to answer one question: can we get an analyst from raw image to signed-off intelligence in under five minutes, with full human verification at every step?"

*[Point at the workflow stepper at the top of the page]*

> "This is the five-stage pipeline Auric describes in their own docs — ingestion, preprocessing, AI detection, quality review, dissemination. Every stage is visible to the analyst."

---

**[0:10–0:25] — Upload + analyze (drag image in, click Analyze)**

> "I drop in an overhead image. I can choose between GPT-4o Vision for zero-shot flexible classification, or YOLO Aerial for pixel-accurate bounding boxes. I'll use OpenAI."

*[Click Analyze Image, watch the timer start]*

> "The time-to-insight clock starts the moment I submit. This isn't vanity — it's Auric's stated success metric. We're going to get this down to under two minutes."

---

**[0:25–0:50] — Review phase (detections appear)**

*[Once detections load, point at the triage queue on the right]*

> "The triage queue sorts by uncertainty — most ambiguous detections first. See this one at 72%? Look at the classification distribution: Box Truck 41%, APC 34%, Tank 18%. That's a fundamentally different signal than just saying 'vehicle detected.' The analyst knows exactly how much uncertainty to carry."

*[Point at a high-confidence card]*

> "This sedan comes in at 91% detection confidence with a clean classification. I'll accept it."

*[Click Accept on one card, Reject on another]*

> "Every action is timestamped — chain of custody. The analyst's decision is part of the record."

---

**[0:50–1:05] — Draw mode (click '+ Draw Detection')**

> "Here's the thing about AI — it misses things. Maybe a vehicle is partially occluded. So I built a draw mode."

*[Toggle draw mode, drag a box over something the AI missed, pick a label from the dropdown]*

> "The analyst draws a box, picks from the vehicle taxonomy, adds a note. That detection goes straight into the record as analyst-added, with full provenance. The AI is a starting point, not the final word."

---

**[1:05–1:20] — Sign off + report**

*[Accept remaining detections, click Sign Off]*

> "Once every detection is reviewed, I sign off. The timer freezes — that's the time-to-insight."

*[Show the dissemination card]*

> "The intelligence report is ready to export. Every confirmed vehicle, detection confidence, classification, estimated length, timestamp, and the analyst who signed off. This is the end of the Auric pipeline — dissemination-ready intelligence, with a human signature at every step."

---

**[1:20–1:30] — Close**

> "I built this end-to-end in about a week — React frontend, serverless Node API, GPT-4o and YOLO as swappable detection backends, deployed on Vercel. The stack doesn't matter. What I was designing is the trust layer — the thing that makes an analyst comfortable putting their name on an AI detection. That's the product."

---

## Tips

- Speak slowly — you'll naturally rush
- Pause for 1 second after each section transition
- If a detection comes back wrong, that's fine — point it out and relabel it. Shows the workflow working exactly as designed.
- Don't apologize for the bounding box imprecision — call it out as the known GPT-4o tradeoff and pivot to "which is why production uses YOLO for localization"
- The timer number at sign-off is your proof point — whatever it says, say it out loud
