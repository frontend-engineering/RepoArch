declare module '@excalidraw/excalidraw/types/element/types' {
  export interface ExcalidrawElement {
    type: 'rectangle' | 'line' | 'text';
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    fillStyle?: 'solid' | 'hachure';
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    roughness?: number;
    opacity?: number;
    groupIds?: string[];
    seed?: number;
    version?: number;
    versionNonce?: number;
    points?: [number, number][];
  }

  export interface ExcalidrawTextElement extends ExcalidrawElement {
    type: 'text';
    text: string;
    fontSize?: number;
    fontFamily?: number;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
  }

  export interface ExcalidrawLineElement extends ExcalidrawElement {
    type: 'line';
    points: [number, number][];
  }
} 