// @ts-nocheck — dead code, not used in current routing (OpenAI path removed)
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type { Detection } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a military intelligence analyst's AI assistant. Analyze this overhead/satellite image for high-value objects relevant to defense operations.

Identify any of the following if present:
- Military or civilian vehicles (trucks, armored vehicles, cars)
- Aircraft (fixed-wing, rotary, UAVs)
- Watercraft (ships, boats, vessels)
- Infrastructure (hangars, storage tanks, runways, radar installations, buildings)
- Personnel groups

Return ONLY a valid JSON array (no markdown, no explanation, no code fences). Each element must follow this exact schema:
{"label":"<object class>","confidence":<float 0.0-1.0>,"bbox":{"x":<px>,"y":<px>,"w":<px>,"h":<px>},"notes":"<one sentence: what visual features support this detection>"}

Calibration rules:
- confidence >= 0.80: clear, unambiguous identification
- confidence 0.50-0.79: probable but uncertain; flag for human review
- confidence < 0.50: speculative; still include but mark uncertain
- If no relevant objects detected, return []
- Bounding boxes are in pixels from top-left of the image
- Do NOT infer objects not clearly visible
- Uncertainty is a feature — honest confidence over overclaiming

This prototype uses public overhead imagery. Production would use proprietary sensor data.`;

interface RawDetection {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  notes?: string;
}

export async function analyzeWithOpenAI(
  base64DataUrl: string,
  filename: string,
  sensorType: string
): Promise<Detection[]> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content ?? '[]';

  console.log('OpenAI raw response:', content.slice(0, 500));

  let raw: RawDetection[];
  try {
    // Strip markdown code fences if model wraps in ```json ... ```
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    raw = JSON.parse(cleaned);
    if (!Array.isArray(raw)) {
      console.error('OpenAI response is not an array:', cleaned);
      raw = [];
    }
  } catch (e) {
    console.error('OpenAI response parse failed:', e, '\nRaw content:', content);
    raw = [];
  }

  return raw.map((item) => ({
    id: uuidv4(),
    label: item.label ?? 'Unknown Object',
    confidence: Math.max(0, Math.min(1, item.confidence ?? 0)),
    bbox: {
      x: Math.round(item.bbox?.x ?? 0),
      y: Math.round(item.bbox?.y ?? 0),
      w: Math.round(item.bbox?.w ?? 50),
      h: Math.round(item.bbox?.h ?? 50),
    },
    status: 'pending' as const,
    notes: item.notes,
    provenance: {
      sourceFile: filename,
      timestamp: new Date().toISOString(),
      sensorType,
      modelVersion: 'gpt-4o-mini-vision-v1',
    },
  }));
}
