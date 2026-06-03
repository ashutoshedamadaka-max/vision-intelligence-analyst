export type DetectionStatus = 'pending' | 'accepted' | 'rejected' | 'relabeled';
export type DetectionMode = 'openai' | 'yolo';
export type ConfidenceBand = 'hi' | 'rev' | 'lo';

export interface ClassificationEntry {
  label: string;
  pct: number; // 0–100
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number; // degrees, for oriented bounding boxes
}

export interface Provenance {
  sourceFile: string;
  timestamp: string;
  sensorType: string;
  modelVersion: string;
}

export interface Detection {
  id: string;
  seq: number;                          // 1-based number shown on image
  label: string;                        // top classification label
  detectionConfidence: number;          // 0–1: is the object there?
  classification: ClassificationEntry[]; // top-3 distribution
  band: ConfidenceBand;                 // derived: hi ≥0.85, rev 0.60–0.84, lo <0.60
  bbox: BBox;
  heading: number;                      // degrees 0–360
  estLength: string;                    // e.g. "4.6 m"
  source: 'ai' | 'manual';
  status: DetectionStatus;
  notes?: string;
  relabeledTo?: string;
  provenance: Provenance;
}

export interface AnalysisResult {
  detections: Detection[];
  analysisId: string;
  processingTimeMs: number;
  mode: DetectionMode;
}

export const VEHICLE_CLASSES = [
  'Sedan', 'SUV', 'Pickup Truck', 'Box Truck', 'Semi Truck',
  'Bus', 'Van', 'Motorcycle', 'Military Truck', 'APC', 'Tank',
  'Aircraft', 'Helicopter', 'Ship', 'Unclassified Vehicle',
] as const;

export type VehicleClass = typeof VEHICLE_CLASSES[number];

export function getBand(conf: number): ConfidenceBand {
  if (conf >= 0.85) return 'hi';
  if (conf >= 0.60) return 'rev';
  return 'lo';
}

export function bandColor(band: ConfidenceBand): string {
  if (band === 'hi') return '#34d399';
  if (band === 'rev') return '#f6b73c';
  return '#fb6a78';
}
