import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

type DetectionStatus = 'pending' | 'accepted' | 'rejected' | 'relabeled';
type DetectionMode = 'openai' | 'yolo';
interface BBox { x: number; y: number; w: number; h: number; }
interface Detection {
  id: string; label: string; confidence: number; bbox: BBox;
  status: DetectionStatus; notes?: string; relabeledTo?: string;
  provenance: { sourceFile: string; timestamp: string; sensorType: string; modelVersion: string; };
}
interface AnalysisResult { detections: Detection[]; analysisId: string; processingTimeMs: number; mode: DetectionMode; }
interface AnalyzeRequest { image: string; filename: string; sensorType: string; mode: DetectionMode; }

const SYSTEM_PROMPT = `You are a military intelligence analyst's AI assistant. Analyze this overhead/satellite image for high-value objects relevant to defense operations.

Identify any of the following if present:
- Military or civilian vehicles (trucks, armored vehicles, cars)
- Aircraft (fixed-wing, rotary, UAVs)
- Watercraft (ships, boats, vessels)
- Infrastructure (hangars, storage tanks, runways, radar installations, buildings)
- Personnel groups

Return ONLY a valid JSON array (no markdown, no explanation, no code fences). Each element:
{"label":"<class>","confidence":<0.0-1.0>,"bbox":{"x":<px>,"y":<px>,"w":<px>,"h":<px>},"notes":"<one sentence>"}

Rules: confidence>=0.80 clear; 0.50-0.79 uncertain; <0.50 speculative. Return [] if nothing found. Bounding boxes in pixels from top-left. Do NOT infer objects not clearly visible.`;

async function analyzeWithOpenAI(base64DataUrl: string, filename: string, sensorType: string): Promise<Detection[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: [{ type: 'text', text: SYSTEM_PROMPT }, { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } }] }],
    max_tokens: 1500,
  });
  const content = response.choices[0]?.message?.content ?? '[]';
  console.log('OpenAI raw response:', content.slice(0, 300));
  let raw: Array<{ label: string; confidence: number; bbox: BBox; notes?: string; }> = [];
  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    raw = JSON.parse(cleaned);
    if (!Array.isArray(raw)) raw = [];
  } catch { console.error('Parse failed:', content); }
  return raw.map((item) => ({
    id: uuidv4(), label: item.label ?? 'Unknown',
    confidence: Math.max(0, Math.min(1, item.confidence ?? 0)),
    bbox: { x: Math.round(item.bbox?.x ?? 0), y: Math.round(item.bbox?.y ?? 0), w: Math.round(item.bbox?.w ?? 50), h: Math.round(item.bbox?.h ?? 50) },
    status: 'pending' as const, notes: item.notes,
    provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'gpt-4o-vision-v1' },
  }));
}

async function analyzeWithRoboflow(base64DataUrl: string, filename: string, sensorType: string): Promise<Detection[]> {
  const apiKey = process.env.ROBOFLOW_API_KEY!;
  const modelId = process.env.ROBOFLOW_MODEL_ID!;
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const res = await fetch(`https://detect.roboflow.com/${modelId}?api_key=${apiKey}&name=${encodeURIComponent(filename)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: base64,
  });
  if (!res.ok) throw new Error(`Roboflow API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { predictions?: Array<{ x: number; y: number; width: number; height: number; confidence: number; class: string; }> };
  return (data.predictions ?? []).map((p) => ({
    id: uuidv4(), label: p.class.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    confidence: Math.max(0, Math.min(1, p.confidence)),
    bbox: { x: Math.round(p.x - p.width / 2), y: Math.round(p.y - p.height / 2), w: Math.round(p.width), h: Math.round(p.height) },
    status: 'pending' as const, notes: `Detected by model (${modelId}).`,
    provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: `roboflow/${modelId}` },
  }));
}

function mockDetections(filename: string, sensorType: string): Detection[] {
  return [
    { id: uuidv4(), label: 'Armored Vehicle', confidence: 0.87, bbox: { x: 120, y: 80, w: 90, h: 65 }, status: 'pending', notes: 'Rectangular form consistent with light armored vehicle.', provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'mock-v1' } },
    { id: uuidv4(), label: 'Storage Tank', confidence: 0.41, bbox: { x: 320, y: 210, w: 70, h: 70 }, status: 'pending', notes: 'Circular shadow pattern; low confidence due to partial occlusion.', provenance: { sourceFile: filename, timestamp: new Date().toISOString(), sensorType, modelVersion: 'mock-v1' } },
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
