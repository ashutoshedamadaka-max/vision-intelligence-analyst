import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { analyzeWithRoboflow } from '../lib/roboflow';
import type { AnalyzeRequest, AnalysisResult, Detection } from '../lib/types';

const GSD_M = 0.31;

// Fallback when Roboflow keys are not configured (local dev convenience)
function mockDetections(filename: string, sensorType: string): Detection[] {
  const ts = new Date().toISOString();
  const prov = (mv: string) => ({ sourceFile: filename, timestamp: ts, sensorType, modelVersion: mv });
  const mv = 'yolo-world-aerial · open-source';
  return [
    {
      id: uuidv4(), seq: 1, label: 'Truck',
      detectionConfidence: 0.92,
      classification: [{ label: 'Truck', pct: 92 }],
      band: 'hi',
      bbox: { x: 120, y: 80, w: 90, h: 45, rot: 0 },
      heading: null,
      estLength: `~${(90 * GSD_M).toFixed(1)} m`,
      manual: false, status: 'pending',
      notes: 'Top class only · mock',
      provenance: prov(mv),
    },
    {
      id: uuidv4(), seq: 2, label: 'Sedan',
      detectionConfidence: 0.71,
      classification: [{ label: 'Sedan', pct: 71 }],
      band: 'rev',
      bbox: { x: 300, y: 200, w: 42, h: 22, rot: 0 },
      heading: null,
      estLength: `~${(42 * GSD_M).toFixed(1)} m`,
      manual: false, status: 'pending',
      notes: 'Top class only · mock',
      provenance: prov(mv),
    },
    {
      id: uuidv4(), seq: 3, label: 'Unclassified',
      detectionConfidence: 0.48,
      classification: [{ label: 'Unclassified', pct: 48 }],
      band: 'lo',
      bbox: { x: 480, y: 310, w: 38, h: 20, rot: 0 },
      heading: null,
      estLength: `~${(38 * GSD_M).toFixed(1)} m`,
      manual: false, status: 'pending',
      notes: 'Top class only · mock',
      provenance: prov(mv),
    },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as Partial<AnalyzeRequest>;

  if (!body.image) {
    return res.status(400).json({ error: 'Missing required field: image (base64 data URL)' });
  }

  const filename = body.filename ?? 'unknown.jpg';
  const sensorType = body.sensorType ?? 'Optical';
  const start = Date.now();

  try {
    let detections: Detection[];

    if (!process.env.ROBOFLOW_API_KEY || !process.env.ROBOFLOW_MODEL_ID) {
      console.warn('Roboflow keys not configured — returning mock detections');
      detections = mockDetections(filename, sensorType);
    } else {
      detections = await analyzeWithRoboflow(body.image, filename, sensorType);
    }

    const result: AnalysisResult = {
      detections,
      analysisId: uuidv4(),
      processingTimeMs: Date.now() - start,
      mode: 'yolo',
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
