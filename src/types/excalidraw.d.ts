export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  strokeSharpness: string;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: any[];
  updated: number;
  link: string | null;
  locked: boolean;
}

export interface ExcalidrawTextElement extends ExcalidrawElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: string;
  verticalAlign: string;
  baseline: number;
}

export interface ExcalidrawLineElement extends ExcalidrawElement {
  type: 'line';
  points: [number, number][];
  lastCommittedPoint: [number, number] | null;
  startBinding: any | null;
  endBinding: any | null;
  startArrowhead: string | null;
  endArrowhead: string | null;
} 