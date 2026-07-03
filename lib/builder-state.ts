export type PhotographyStyle = "airy" | "moody";

export interface BuilderState {
  photography_style?: PhotographyStyle;
  room_feeling?: string;
  floral_style?: string;
  colors_chosen?: string[];
  season?: string;
  ceremony_location?: string;
  signature_drink?: string;
  priority?: string;
  all_inclusive_intent?: boolean;
  guest_count?: number;
  additional_notes?: string;
  couple_names?: string;
  wedding_date?: string;
  email?: string;
  budget_range?: string;
  heard_about?: string;
}

const STORAGE_KEY = "hv_builder";

export function getBuilderState(): BuilderState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setBuilderState(updates: Partial<BuilderState>): BuilderState {
  const current = getBuilderState();
  const next = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearBuilderState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
