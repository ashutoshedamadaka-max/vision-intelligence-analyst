export type DetectionStatus = 'pending' | 'confirmed' | 'rejected' | 'relabeled';
export type DetectionMode = 'yolo';
export type ConfidenceBand = 'hi' | 'rev' | 'lo' | 'man';

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
  classification: ClassificationEntry[]; // top-3 from model; 1-entry for YOLO / analyst
  band: ConfidenceBand;                 // hi ≥0.85 / rev 0.60–0.84 / lo <0.60 / man = analyst-defined
  bbox: BBox;
  heading: number | null;               // degrees 0–360; null when unknown
  estLength: string;                    // e.g. "~4.6 m" (estimated from GSD)
  source: 'ai' | 'manual';
  manual: boolean;                      // true for analyst-defined detections
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

// Full taxonomy for relabeling (broad)
export const VEHICLE_CLASSES = [
  'Sedan', 'SUV', 'Pickup Truck', 'Box Truck', 'Semi Truck',
  'Bus', 'Van', 'Motorcycle', 'Military Truck', 'APC', 'Tank',
  'Aircraft', 'Helicopter', 'Ship', 'Unclassified Vehicle',
] as const;

export type VehicleClass = typeof VEHICLE_CLASSES[number];

// Simplified taxonomy for draw-to-define (and relabeling)
export const VEHICLE_TAXONOMY = [
  'Car', 'SUV', 'Pickup', 'Van', 'Truck', 'Bus', 'Unclassified',
] as const;

export type VehicleTaxonomy = typeof VEHICLE_TAXONOMY[number];

export function getBand(conf: number): 'hi' | 'rev' | 'lo' {
  if (conf >= 0.85) return 'hi';
  if (conf >= 0.60) return 'rev';
  return 'lo';
}

export function bandColor(band: ConfidenceBand): string {
  if (band === 'hi') return '#34d399';
  if (band === 'rev') return '#f6b73c';
  if (band === 'man') return '#38bdf8';
  return '#fb6a78';
}
