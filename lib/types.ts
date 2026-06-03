export type DetectionStatus = 'pending' | 'accepted' | 'rejected' | 'relabeled';
export type DetectionMode = 'openai' | 'yolo';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Provenance {
  sourceFile: string;
  timestamp: string;
  sensorType: string;
  modelVersion: string;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: BBox;
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
  mode: DetectionMode;
}
