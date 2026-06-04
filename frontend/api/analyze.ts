import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

type DetectionStatus = 'pending' | 'accepted' | 'rejected' | 'relabeled';
type DetectionMode = 'openai' | 'yolo';
type ConfidenceBand = 'hi' | 'rev' | 'lo';

interface ClassificationEntry { label: string; pct: number; }
interface BBox { x: number; y: number; w: number; h: number; rot?: number; }
interface Detection {
  id: string; seq: number; label: string;
  detectionConfidence: number; classification: ClassificationEntry[];
  band: ConfidenceBand; bbox: BBox; heading: number; estLength: string;
  source: 'ai' | 'manual'; status: DetectionStatus; notes?: string;
  provenance: { sourceFile: string; timestamp: string; sensorType: string; modelVersion: string; };
}
interface AnalysisResult { detections: Detection[]; analysisId: string; processingTimeMs: number; mode: DetectionMode; }
interface AnalyzeRequest { image: string; filename: string; sensorType: string; mode: DetectionMode; }

function getBand(conf: number): ConfidenceBand {
  if (conf >= 0.85) return 'hi';
  if (conf >= 0.60) return 'rev';
  return 'lo';
}

const SYSTEM_PROMPT = `You are an overhead imagery analyst specializing in fine-grained vehicle detection and classification.

Analyze this overhead/satellite image. Detect and classify ALL visible vehicles and high-value objects.

For each detection return a JSON object with this EXACT schema:
{
  "label": "<top vehicle class>",
  "detectionConfidence": <float 0.0-1.0>,
  "classification": [["<class1>", <pct>], ["<class2>", <pct>], ["<class3>", <pct>]],
  "bbox": {"x": <px>, "y": <px>, "w": <px>, "h": <px>, "rot": <degrees -45 to 45>},
  "heading": <degrees 0-360>,
  "estLength": "<N.N m>",
  "notes": "<one sentence: visual evidence>"
}

Vehicle classes to use: Sedan, SUV, Pickup Truck, Box Truck, Semi Truck, Bus, Van, Motorcycle, Military Truck, APC, Tank, Aircraft, Helicopter, Ship, Unclassified Vehicle.

Classification array: top-3 classes with integer percentages summing to ~100. Vary them realistically — ambiguous cases should have near-even splits (e.g. 41/34/18).

Confidence rules:
- detectionConfidence >= 0.85: clearly visible, unambiguous object
- 0.60–0.84: probable but partially occluded or uncertain — flag for review
- < 0.60: speculative, heavy shadow or edge-of-frame — include but mark uncertain
- VARY confidence across detections — do NOT return all 95%. Include at least one ambiguous detection below 0.75.
- rot: estimated rotation of the vehicle in degrees from horizontal (negative = counterclockwise)
- heading: direction vehicle is pointing in compass degrees (0=N, 90=E, 180=S, 270=W)
- estLength: rough length estimate in meters (sedan ~4.5m, SUV ~5m, truck ~12m)

Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Return [] if no vehicles detected.`;

async function analyzeWithOpenAI(base64DataUrl: string, filename: string, sensorType: string): Promise<Detection[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: [
      { type: 'text', text: SYSTEM_PROMPT },
      { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } },
    ]}],
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? '[]';
  console.log('OpenAI raw response:', content.slice(0, 500));

  let raw: Array<{
    label: string; detectionConfidence: number;
    classification: Array<[string, number]>;
    bbox: BBox; heading: number; estLength: string; notes?: string;
  }> = [];

  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    raw = JSON.parse(cleaned);
    if (!Array.isArray(raw)) raw = [];
  } catch { console.error('Parse failed:', content); }

  return raw.map((item, i) => {
    const conf = Math.max(0, Math.min(1, item.detectionConfidence ?? 0));
    const cls: ClassificationEntry[] = (item.classification ?? [[item.label, 100]])
      .map(([label, pct]: [string, number]) => ({ label: label ?? 'Unknown', pct: Math.round(pct) }))
      .slice(0, 3);

    return {
      id: uuidv4(),
      seq: i + 1,
      label: item.label ?? 'Unclassified Vehicle',
      detectionConfidence: conf,
      classification: cls,
      band: getBand(conf),
      bbox: {
        x: Math.round(item.bbox?.x ?? 0),
        y: Math.round(item.bbox?.y ?? 0),
        w: Math.round(item.bbox?.w ?? 50),
        h: Math.round(item.bbox?.h ?? 25),
        rot: item.bbox?.rot ?? 0,
      },
      heading: Math.round(item.heading ?? 0),
      estLength: item.estLength ?? '~5 m',
      source: 'ai' as const,
      status: 'pending' as const,
      notes: item.notes,
      provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'gpt-4o-vision-v1' },
    };
  });
}

async function analyzeWithRoboflow(base64DataUrl: string, filename: string, sensorType: string): Promise<Detection[]> {
  const apiKey = process.env.ROBOFLOW_API_KEY!;
  const modelId = process.env.ROBOFLOW_MODEL_ID!;
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  // Send as binary to avoid base64 + → space corruption in x-www-form-urlencoded
  const imageBuffer = Buffer.from(base64, 'base64');
  const res = await fetch(`https://detect.roboflow.com/${modelId}?api_key=${apiKey}&name=${encodeURIComponent(filename)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: imageBuffer,
  });
  if (!res.ok) throw new Error(`Roboflow API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { predictions?: Array<{ x: number; y: number; width: number; height: number; confidence: number; class: string; }> };

  return (data.predictions ?? []).map((p, i) => {
    const conf = Math.max(0, Math.min(1, p.confidence));
    const label = p.class.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: uuidv4(), seq: i + 1, label,
      detectionConfidence: conf,
      classification: [{ label, pct: Math.round(conf * 100) }],
      band: getBand(conf),
      bbox: { x: Math.round(p.x - p.width / 2), y: Math.round(p.y - p.height / 2), w: Math.round(p.width), h: Math.round(p.height), rot: 0 },
      heading: 0,
      estLength: '~5 m',
      source: 'ai' as const,
      status: 'pending' as const,
      notes: `Detected by vehicle detection model (${modelId}).`,
      provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: `roboflow/${modelId}` },
    };
  });
}

function mockDetections(filename: string, sensorType: string): Detection[] {
  return [
    { id: uuidv4(), seq: 1, label: 'Box Truck', detectionConfidence: 0.96, classification: [{ label: 'Box Truck', pct: 88 }, { label: 'Semi Truck', pct: 9 }, { label: 'Bus', pct: 3 }], band: 'hi', bbox: { x: 170, y: 300, w: 78, h: 36, rot: -8 }, heading: 142, estLength: '12.4 m', source: 'ai', status: 'pending', notes: 'Clear roof signature consistent with box truck.', provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'mock-v1' } },
    { id: uuidv4(), seq: 2, label: 'Sedan', detectionConfidence: 0.91, classification: [{ label: 'Sedan', pct: 91 }, { label: 'SUV', pct: 7 }, { label: 'Van', pct: 2 }], band: 'hi', bbox: { x: 332, y: 248, w: 40, h: 21, rot: 6 }, heading: 31, estLength: '4.6 m', source: 'ai', status: 'pending', notes: 'High confidence — clear identification.', provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'mock-v1' } },
    { id: uuidv4(), seq: 3, label: 'Unclassified Vehicle', detectionConfidence: 0.72, classification: [{ label: 'Box Truck', pct: 41 }, { label: 'APC', pct: 34 }, { label: 'Tank', pct: 18 }], band: 'rev', bbox: { x: 480, y: 352, w: 66, h: 34, rot: 22 }, heading: 240, estLength: '~6.8 m', source: 'ai', status: 'pending', notes: 'Partial occlusion at frame edge — class ambiguous.', provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'mock-v1' } },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as Partial<AnalyzeRequest>;
  if (!body.image) return res.status(400).json({ error: 'Missing required field: image' });

  const filename = body.filename ?? 'unknown.jpg';
  const sensorType = body.sensorType ?? 'Optical';
  const mode = body.mode ?? 'openai';
  const start = Date.now();

  try {
    let detections: Detection[];
    if (mode === 'yolo') {
      if (!process.env.ROBOFLOW_API_KEY || !process.env.ROBOFLOW_MODEL_ID)
        return res.status(503).json({ error: 'YOLO mode unavailable: Roboflow keys not configured' });
      detections = await analyzeWithRoboflow(body.image, filename, sensorType);
    } else {
      detections = process.env.OPENAI_API_KEY
        ? await analyzeWithOpenAI(body.image, filename, sensorType)
        : mockDetections(filename, sensorType);
    }
    return res.status(200).json({ detections, analysisId: uuidv4(), processingTimeMs: Date.now() - start, mode } as AnalysisResult);
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}
