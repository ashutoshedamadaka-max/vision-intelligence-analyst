export type DetectionStatus = 'pending' | 'confirmed' | 'rejected' | 'relabeled';
export type DetectionMode = 'yolo';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

export interface ClassificationEntry {
  label: string;
  pct: number; // 0–100
}

export interface Provenance {
  sourceFile: string;
  timestamp: string;
  sensorType: string;
  modelVersion: string;
}

export interface Detection {
  id: string;
  seq: number;
  label: string;
  detectionConfidence: number;          // 0–1
  classification: ClassificationEntry[]; // 1-entry from YOLO (top class only)
  band: 'hi' | 'rev' | 'lo';           // derived server-side
  bbox: BBox;
  heading: number | null;
  estLength: string;                    // ~N.N m, estimated from bbox.w × GSD
  manual: boolean;                      // always false from backend
  status: DetectionStatus;
  notes?: string;
  provenance: Provenance;
}

export interface AnalysisResult {
  detections: Detection[];
  analysisId: string;
  processingTimeMs: number;
  mode: DetectionMode;
}

export interface AnalyzeRequest {
  image: string;       // base64 data URL: "data:image/jpeg;base64,..."
  filename: string;
  sensorType: string;
  mode?: DetectionMode;
}
