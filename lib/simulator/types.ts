/*
 * Shared types for the haircut simulator (ported from the CorteAI build).
 * Internal enum values for face/hair traits stay in the Spanish form the vision
 * schema and the catalog already agree on; the UI translates them for display.
 * Changing an enum here means changing the response schema in prompts.ts and
 * every catalog entry's hairTypes in lockstep.
 */

export type Angle = "front" | "left" | "right";
/* 'back' is derived, never captured: nobody can photograph the back of their own
   head. It is generated from BOTH profile photos and labelled illustrative. */
export type SimAngle = Angle | "back";

export type FaceShape =
  | "oval"
  | "rectangular"
  | "square"
  | "round"
  | "heart"
  | "diamond"
  | "triangular";

export interface PhotoVerdict {
  angle: Angle;
  ok: boolean;
  issue?: string;
}

export interface VisualProfile {
  face: {
    primaryShape: FaceShape;
    secondaryShape?: FaceShape;
    confidence: number;
  };
  head: {
    overallShape: "corta" | "media" | "alargada";
    lateralVolume: "bajo" | "medio" | "alto";
    foreheadSize: "baja" | "media" | "alta";
    confidence: number;
  };
  hair: {
    texture: "liso" | "ondulado" | "rizado" | "muy-rizado";
    density: "baja" | "media" | "alta";
    volume: "bajo" | "medio" | "alto";
    length: "muy-corto" | "corto" | "medio" | "largo";
    hairline: "normal" | "entradas" | "retroceso";
    confidence: number;
  };
  visualQuality: number;
}

export interface Preferences {
  style?: "modern" | "classic" | "elegant" | "casual" | "youthful" | "professional" | "bold" | "";
  maintenance?: "minimal" | "low" | "medium" | "any" | "";
  length?: "muy-corto" | "corto" | "medio" | "largo" | "any" | "";
  fade?: "yes" | "no" | "any" | "";
  goal?: string;
}

export interface Hairstyle {
  id: string;
  name: string;
  category: string;
  lengthClass: "muy-corto" | "corto" | "medio" | "largo";
  hasFade: boolean;
  cutTexture: "low" | "medium" | "high";
  volume: "low" | "medium" | "high";
  maintenance: "low" | "low-medium" | "medium" | "high";
  hairTypes: Array<"liso" | "ondulado" | "rizado" | "muy-rizado">;
  needsDensity: "baja" | "media" | "alta";
  recommendedFaceShapes: FaceShape[];
  vibes: string[];
  /* What the barber reads on the card. */
  barber: {
    top: string;
    sides: string;
    fade: string;
    texture: string;
    fringe: string;
    finish: string;
  };
  /* What the image generator reads. One authoritative description per style. */
  gen: string;
}

export interface ScoredStyle {
  style: Hairstyle;
  score: number;
  reasons: string[];
  cautions: string[];
}

export interface AnalyzeRequest {
  photos: Record<Angle, string>;
  preferences: Preferences;
  /* the visitor's explicit yes to the improvement log; without it, nothing is
     stored even where the store is enabled */
  consent?: boolean;
}

export interface ScoredStyleDTO {
  id: string;
  score: number;
  reasons: string[];
  cautions: string[];
}

export interface AnalyzeResponse {
  mock: boolean;
  provider: string;
  profile: VisualProfile;
  perPhoto: PhotoVerdict[];
  recommendation: ScoredStyleDTO;
  alternatives: ScoredStyleDTO[];
  /* present when the local improvement log is enabled (NEXT_PUBLIC_SIM_STORE=1) */
  sessionId?: string;
  stored?: boolean;
}

export interface SimulateRequest {
  photos: Partial<Record<Angle, string>>;
  hairstyleId: string;
  angle?: SimAngle;
  hairTexture?: string;
  sessionId?: string; /* improvement log, when enabled */
}

export interface SimulateResponse {
  mock: boolean;
  provider: string;
  hairstyleId: string;
  angle: SimAngle;
  image: string;
  attempts?: number;
}
