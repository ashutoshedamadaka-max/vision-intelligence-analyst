import type { AnalysisResult, DetectionMode } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function analyzeImage(
  file: File,
  mode: DetectionMode
): Promise<AnalysisResult> {
  const base64DataUrl = await fileToBase64(file);

  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64DataUrl,
      filename: file.name,
      sensorType: 'Optical',
      mode,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Analysis failed: ${res.status}`);
  }

  return res.json() as Promise<AnalysisResult>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
