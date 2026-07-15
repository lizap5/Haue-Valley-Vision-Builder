export type PhotographyStyle = "airy" | "moody";

export interface BuilderState {
  photography_style?: PhotographyStyle;
  vibe?: string;                 // one of VIBES values (matches calculator)
  ceremony_location?: string;    // stone_wall | fireplace | forest_view | unsure
  aisle_flowers?: string;        // feyre | cassian | gwen | velaris | unsure
  arch_selection?: string;       // feyre_arch | elaine_arch | cassian_arch | gwen_arch | wooden_cross | wooden_arbor | unsure
  linen_colors?: string[];       // up to 3 LINEN_COLORS values
  accent_metal?: string;         // gold | silver
  season?: string;
  signature_drinks?: string[];   // up to 2 SIGNATURE_DRINKS values
  alcohol_opt_out?: boolean;
  priority?: string;
  all_inclusive_intent?: boolean;
  guest_count?: number;
  additional_notes?: string;
  couple_names?: string;
  wedding_date?: string;
  email?: string;
  budget_range?: string;
  heard_about?: string;

  // Legacy fields kept so previously saved sessions don't break
  room_feeling?: string;
  floral_style?: string;
  colors_chosen?: string[];
  signature_drink?: string;
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
