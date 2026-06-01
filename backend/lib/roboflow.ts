import { v4 as uuidv4 } from 'uuid';
import type { Detection } from './types';

interface RoboflowPrediction {
  x: number;       // center x (relative 0-1 or absolute px — depends on API version)
  y: number;       // center y
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image?: { width: number; height: number };
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

  // Strip the data URL prefix to get raw base64
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

  // Roboflow returns center-based coords (absolute pixels).
  // Convert to top-left origin: x = cx - w/2, y = cy - h/2
  return predictions.map((p) => ({
    id: uuidv4(),
    label: formatLabel(p.class),
    confidence: Math.max(0, Math.min(1, p.confidence)),
    bbox: {
      x: Math.round(p.x - p.width / 2),
      y: Math.round(p.y - p.height / 2),
      w: Math.round(p.width),
      h: Math.round(p.height),
    },
    status: 'pending' as const,
    notes: `Detected by aerial-trained YOLOv8 model (${modelId}).`,
    provenance: {
      sourceFile: filename,
      timestamp: new Date().toISOString(),
      sensorType,
      modelVersion: `roboflow-yolov8/${modelId}`,
    },
  }));
}

function formatLabel(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
