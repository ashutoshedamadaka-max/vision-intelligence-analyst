import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { analyzeWithOpenAI } from '../lib/openai';
import { analyzeWithRoboflow } from '../lib/roboflow';
import type { AnalyzeRequest, AnalysisResult, Detection } from '../lib/types';

function mockDetections(filename: string, sensorType: string): Detection[] {
  return [
    {
      id: uuidv4(),
      label: 'Armored Vehicle',
      confidence: 0.87,
      bbox: { x: 120, y: 80, w: 90, h: 65 },
      status: 'pending',
      notes: 'Rectangular form with track width consistent with light armored vehicle.',
      provenance: {
        sourceFile: filename,
        timestamp: new Date().toISOString(),
        sensorType,
        modelVersion: 'mock-v1',
      },
    },
    {
      id: uuidv4(),
      label: 'Storage Tank',
      confidence: 0.41,
      bbox: { x: 320, y: 210, w: 70, h: 70 },
      status: 'pending',
      notes: 'Circular shadow pattern may indicate above-ground storage tank; low confidence due to partial occlusion.',
      provenance: {
        sourceFile: filename,
        timestamp: new Date().toISOString(),
        sensorType,
        modelVersion: 'mock-v1',
      },
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
  const mode = body.mode ?? 'openai';

  const start = Date.now();

  try {
    let detections: Detection[];

    if (mode === 'yolo') {
      if (!process.env.ROBOFLOW_API_KEY || !process.env.ROBOFLOW_MODEL_ID) {
        return res.status(503).json({ error: 'YOLO mode unavailable: ROBOFLOW_API_KEY / ROBOFLOW_MODEL_ID not configured' });
      }
      detections = await analyzeWithRoboflow(body.image, filename, sensorType);
    } else {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set — returning mock detections');
        detections = mockDetections(filename, sensorType);
      } else {
        detections = await analyzeWithOpenAI(body.image, filename, sensorType);
      }
    }

    const result: AnalysisResult = {
      detections,
      analysisId: uuidv4(),
      processingTimeMs: Date.now() - start,
      mode,
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
