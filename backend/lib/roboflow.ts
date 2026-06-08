import { v4 as uuidv4 } from 'uuid';
import type { Detection } from './types';

const GSD_M = 0.31; // ground sample distance in metres per pixel (demo default)

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image?: { width: number; height: number };
}

function getBand(conf: number): 'hi' | 'rev' | 'lo' {
  if (conf >= 0.85) return 'hi';
  if (conf >= 0.60) return 'rev';
  return 'lo';
}

export async function analyzeWithRoboflow(
  base64DataUrl: string,
  filename: string,
  sensorType: string
): Promise<Detection[]> {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  const modelId = process.env.ROBOFLOW_MODEL_ID;

  if (!apiKey || !modelId) {
    throw new Error('ROBOFLOW_API_KEY and ROBOFLOW_MODEL_ID must be set');
  }

  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  const url = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}&name=${encodeURIComponent(filename)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: base64,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Roboflow API error ${res.status}: ${text}`);
  }

  const data: RoboflowResponse = await res.json();
  const predictions = data.predictions ?? [];
  const ts = new Date().toISOString();

  return predictions.map((p, i) => {
    const conf = Math.max(0, Math.min(1, p.confidence));
    const w = Math.round(p.width);
    const h = Math.round(p.height);
    const label = formatLabel(p.class);

    return {
      id: uuidv4(),
      seq: i + 1,
      label,
      detectionConfidence: conf,
      classification: [{ label, pct: Math.round(conf * 100) }],
      band: getBand(conf),
      bbox: {
        x: Math.round(p.x - p.width / 2),
        y: Math.round(p.y - p.height / 2),
        w,
        h,
        rot: 0,
      },
      heading: null,
      estLength: `~${(w * GSD_M).toFixed(1)} m`,
      manual: false,
      status: 'pending' as const,
      notes: `Top class only · yolo-world-aerial · open-source`,
      provenance: {
        sourceFile: filename,
        timestamp: ts,
        sensorType,
        modelVersion: 'yolo-world-aerial · open-source',
      },
    };
  });
}

function formatLabel(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
