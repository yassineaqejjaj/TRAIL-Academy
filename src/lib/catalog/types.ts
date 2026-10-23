export type CourseStatus = "draft" | "coming_soon" | "published" | "archived";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Phase {
  id: number;
  slug: string;
  title: string;
  summary: string;
}

export interface Course {
  /** Database id; absent for the static seed catalog. */
  id?: string;
  /** Stable module code, e.g. "M4". */
  code: string;
  slug: string;
  title: string;
  summary: string;
  phaseId: number;
  /** Position in the recommended learning order (1-based). */
  order: number;
  status: CourseStatus;
  difficulty: Difficulty;
  /** Estimated duration in hours. Planning value, to be confirmed by the instructor. */
  durationHours: number;
  topics: string[];
  prerequisites: string[];
  tools: string[];
  outcomes: string[];
  deliverable: string;
  /** Slot reserved for real instructor content in the MVP. */
  mvpSlot: boolean;
}

export interface LearningPath {
  slug: string;
  title: string;
  tagline: string;
  audience: string;
  courseCodes: string[];
  accessMonths: number;
  /** "all" means every module in the catalog (AI Mastery). */
  kind: "path" | "bundle";
}

export interface Offer {
  slug: string;
  kind: "course" | "path" | "bundle" | "enterprise";
  title: string;
  /** Amount in euro cents. Null = quotation. Editable from admin; Stripe remains the payment source of truth. */
  amountCents: number | null;
  taxMode: "ttc" | "ht";
  accessMonths: number | null;
  note?: string;
  /** Show "à partir de" before the amount. */
  priceFrom?: boolean;
}

/** Everything the public site needs, from the database or from the static seed data. */
export interface Catalog {
  phases: Phase[];
  courses: Course[];
  learningPaths: LearningPath[];
  /** Non-course offers (paths, bundle, enterprise) plus a synthetic "module-individuel". */
  offers: Offer[];
  /** Price in euro cents per course slug; absent when the course has no sellable product. */
  coursePrices: Record<string, number>;
}
