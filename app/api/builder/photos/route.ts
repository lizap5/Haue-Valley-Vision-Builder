import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { SIGNATURE_DRINKS, AISLE_FLOWERS, ARCHES, labelFor } from "@/lib/calculator-options";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID!;

interface AirtableAttachment {
  url: string;
  filename?: string;
  size?: number;
  thumbnails?: { large?: { url: string } };
}

interface AirtableRecord {
  id: string;
  fields: {
    "Image Name"?: string;
    "Google Drive Link"?: string;
    "Image Preview"?: AirtableAttachment[];
    "Color Tags"?: string[];
    "Space Tags"?: string[];
    "Season Tags"?: string[];
    "Vibe Tags"?: string[];
    "Metal Tags"?: string[];
    "Aisle Tags"?: string[];
    "Arch Tags"?: string[];
    "Ceremony Location Tags"?: string[];
    "Setting Tags"?: string[];
    "Floral Style Tags"?: string[];
    "Mood Tags"?: string[];
    "Drinks Tags"?: string[];
    "Dance Floor Location"?: string[];
    "Notes"?: string;
    [key: string]: unknown;
  };
}

// Field names people reasonably use for the same thing in Airtable. The first
// non-empty match wins, so renaming a column does not silently zero a score.
const FIELD_ALIASES: Record<string, string[]> = {
  vibe:     ["Vibe Tags", "Vibes", "Vibe"],
  space:    ["Space Tags", "Spaces", "Space"],
  season:   ["Season Tags", "Seasons", "Season"],
  color:    ["Color Tags", "Colors", "Color"],
  metal:    ["Metal Tags", "Metals", "Accent Metal"],
  mood:     ["Mood Tags", "Moods", "Mood"],
  drinks:   ["Drinks Tags", "Drink Tags", "Drinks"],
  aisle:    ["Aisle Tags", "Aisle Flowers", "Aisle"],
  arch:     ["Arch Tags", "Arch Selection", "Arch"],
  ceremony: ["Ceremony Location Tags", "Ceremony Location", "Ceremony Tags"],
  setting:  ["Setting Tags", "Setting", "Indoor Outdoor"],
};

// Reads a tag list by logical name, tolerating the alias spellings above.
function tags(record: AirtableRecord, key: keyof typeof FIELD_ALIASES): string[] {
  for (const name of FIELD_ALIASES[key]) {
    const value = record.fields[name];
    if (Array.isArray(value) && value.length) return value as string[];
    if (typeof value === "string" && value.trim()) return [value];
  }
  return [];
}

export interface ScoredPhoto {
  id: string;
  url: string;
  name: string;
  score: number;
  space?: string;
}

// The three slots every mood board must fill, in FILL order, which is not the
// display order: the page looks each slot up by name. Order matters because
// earlier slots claim their photo first. Each slot accepts several Space Tags
// values, because the library's vocabulary is more granular than the board is
// (a Head Table photo is still a reception photo).
const SPACE_SLOTS: { slot: string; accepts: string[]; prefersNot?: string[] }[] = [
  {
    slot: "Ceremony",
    accepts: [
      "Ceremony", "Ceremony Outdoor", "Ceremony - Indoor", "Ceremony Indoor",
      "Ceremony Area - Stone Wall", "Ceremony Area - Forest View",
      "Ceremony Area - Trees", "Fireplace Indoor",
    ],
    // "Fireplace Indoor" is a place, not an event: the fireplace is both the
    // indoor ceremony backdrop and where the head table goes. Around fifty
    // photos carry it and many are receptions, so a photo also tagged for
    // dining is one, and a couple would see a head table labelled Ceremony.
    prefersNot: ["Head Table", "Reception", "Dance Floor"],
  },
  {
    // Was "Upper Patio", which no photo ever carried, so the slot always read
    // "coming soon". This is the wide shot of the room, and it is filled
    // BEFORE the Reception slot below: a close-up of a centerpiece is welcome
    // on the board, but only once the whole space has been shown. Filling in
    // the other order lets the one wide photo get taken by the Reception slot,
    // leaving two close-ups and no room. Display order lives in the page.
    slot: "Reception Space",
    accepts: ["Reception", "Dance Floor", "Head Table"],
    prefersNot: ["Detail Shot"],
  },
  {
    // Anything reception, close-ups included. `used` guarantees it differs
    // from the wide shot above.
    slot: "Reception",
    accepts: ["Reception", "Head Table", "Dance Floor"],
  },
];

const BAR_SIGN_SPACE = "Bar Sign";

// The library writes drink names loosely: "Rum & Coke" for our "Rum and Coke",
// "Whiskey & Coke" for our "Whiskey Coke". Compare on a normalized form so an
// ampersand or a stray "and" does not lose the match.
function normalizeDrink(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && word !== "and")
    .join(" ");
}

// Category tags rather than drink names. Every drink photo carries these, so
// they cannot identify which drink a photo shows.
const GENERIC_DRINK_TAGS = new Set(["signature drink", "cocktails", "cocktail", "drinks"]);

function specificDrinkTags(record: AirtableRecord): string[] {
  return tags(record, "drinks").filter((t) => !GENERIC_DRINK_TAGS.has(normalizeDrink(t)));
}

// A drink photo is any record naming a specific drink, however it is filed.
// The library tags these "Bar Area" + "Detail Shot" rather than "Bar Sign",
// so requiring that one space tag would find nothing.
function isDrinkPhoto(record: AirtableRecord): boolean {
  return tags(record, "space").includes(BAR_SIGN_SPACE) || specificDrinkTags(record).length > 0;
}

// Ceremony is the one space with distinct locations, indoor and outdoor.
// When the couple has chosen one, the Ceremony slot prefers a photo of that
// exact location before falling back to any ceremony photo.
const CEREMONY_LOCATION_TAG_MAP: Record<string, string> = {
  stone_wall:  "The Stone Wall",
  fireplace:   "The Fireplace",
  forest_view: "The Forest View",
};

// Several existing Space Tags already name the ceremony site. Treat them as
// equivalent to a Ceremony Location Tag so photos tagged before that field
// existed still match the couple's chosen site.
const CEREMONY_LOCATION_FROM_SPACE: Record<string, string> = {
  "Ceremony Area - Stone Wall":  "The Stone Wall",
  "Ceremony Area - Forest View": "The Forest View",
  "Ceremony Area - Trees":       "The Forest View", // older name for the same site
  "Ceremony - Indoor":           "The Fireplace",
  "Ceremony Indoor":             "The Fireplace",
  "Fireplace Indoor":            "The Fireplace",
};

// Every ceremony site a photo can be read as showing, from either field.
function ceremonyLocationsOf(record: AirtableRecord): string[] {
  const explicit = tags(record, "ceremony");
  const derived = tags(record, "space")
    .map((t) => CEREMONY_LOCATION_FROM_SPACE[t])
    .filter(Boolean);
  return [...new Set([...explicit, ...derived])];
}

// Drive's uc?export=view endpoint often returns an HTML interstitial rather
// than image bytes. The thumbnail endpoint serves a real image, and sz sets
// the long edge in pixels.
function driveToDirectUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  return url;
}

function getImageUrl(record: AirtableRecord): string | null {
  const attachments = record.fields["Image Preview"];
  if (attachments?.length) {
    return attachments[0].thumbnails?.large?.url ?? attachments[0].url;
  }
  const driveLink = record.fields["Google Drive Link"];
  if (driveLink) return driveToDirectUrl(driveLink);
  return null;
}

// Maps builder state values to Airtable tag values
const SEASON_MAP: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

// Vibe values -> Airtable "Vibe Tags" values (exact calculator names)
const VIBE_TAG_MAP: Record<string, string> = {
  garden_party:         "Garden Party",
  timeless_estate:      "Timeless Estate",
  european_summer:      "European Summer",
  moody_romance:        "Moody Romance",
  colorful_celebration: "Colorful Celebration",
  something_blue:       "Something Blue",
  elevated_western:     "Elevated Western",
  editorial_romance:    "Editorial Romance",
};

// Linen color values -> Airtable "Color Tags" values
const LINEN_COLOR_TAG_MAP: Record<string, string[]> = {
  white:        ["White", "Ivory"],
  ivory:        ["Ivory", "White"],
  beige:        ["Beige", "Ivory"],
  maize_yellow: ["Yellow", "Gold"],
  blush:        ["Blush", "Ivory"],
  dusty_rose:   ["Blush", "Burgundy"],
  burgundy:     ["Burgundy"],
  navy:         ["Navy", "Blue"],
  eggplant:     ["Purple", "Burgundy"],
  lilac:        ["Purple", "Blush"],
  light_blue:   ["Blue"],
  slate_blue:   ["Blue", "Navy"],
  light_olive:  ["Green"],
  forest_green: ["Green", "Emerald"],
  brown:        ["Brown", "Terracotta"],
  light_grey:   ["Grey", "White"],
  black:        ["Black"],
};

// Colors that say nothing about a couple's linen choice, so carrying one is
// never held against a photo. Ivory, White, Beige and Grey are on almost every
// table; Gold and Silver are the accent metals, scored separately below; Green
// is foliage and Brown is the barn itself, both of which are in a photograph
// whatever the linens are. Everything else -- Terracotta, Burgundy, Emerald,
// Teal, Navy, Blush, Purple, Black -- reads as a deliberate color decision.
const NEUTRAL_COLOR_TAGS = new Set([
  "Ivory", "White", "Beige", "Grey", "Gray", "Gold", "Silver", "Green", "Brown",
]);

function scoreRecord(record: AirtableRecord, state: BuilderState): number {
  let score = 0;

  // Vibe match is the strongest signal: +5
  const vibeTag = VIBE_TAG_MAP[state.vibe ?? ""];
  const recordVibes = tags(record, "vibe");
  if (vibeTag && recordVibes.includes(vibeTag)) score += 5;

  // A photo carrying only other vibes is off brief, and a board showing two
  // aesthetics at once reads as though nobody looked at it. Untagged photos
  // are unaffected: no vibe recorded is not the same as the wrong one.
  if (vibeTag && recordVibes.length && !recordVibes.includes(vibeTag)) score -= 5;

  // Their exact aisle flowers and arch: +4 each. These are specific enough
  // that a match is nearly always the right photo to show.
  const skippedAisle = !state.aisle_flowers || state.aisle_flowers === "unsure";
  const skippedArch = !state.arch_selection || state.arch_selection === "unsure";

  const aisleTag = labelFor(AISLE_FLOWERS, state.aisle_flowers);
  if (aisleTag && !skippedAisle && tags(record, "aisle").includes(aisleTag)) score += 4;

  const archTag = labelFor(ARCHES, state.arch_selection);
  if (archTag && !skippedArch && tags(record, "arch").includes(archTag)) score += 4;

  // Skipping these steps is an answer, not an absence. A photo built around a
  // named arch or aisle arrangement puts a decision on the board that the
  // couple deliberately left open, and reads as though they had chosen it.
  // Push those down rather than barring them, so the board still fills when
  // the library has little else.
  if (skippedArch && tags(record, "arch").length) score -= 3;
  if (skippedAisle && tags(record, "aisle").length) score -= 3;

  // Their ceremony location: +4
  const ceremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
  if (ceremonyTag && ceremonyLocationsOf(record).includes(ceremonyTag)) score += 4;

  // Season match: +3
  const seasonTag = SEASON_MAP[state.season ?? ""];
  if (seasonTag && tags(record, "season").includes(seasonTag)) score += 3;

  // Linen color tags: +2 per match
  const chosen = state.linen_colors ?? state.colors_chosen ?? [];
  const colorTags = [...new Set(chosen.flatMap((c) => LINEN_COLOR_TAG_MAP[c] ?? []))];
  for (const tag of colorTags) {
    if (tags(record, "color").includes(tag)) score += 2;
  }

  // ...and -2 per statement color the couple did not choose. Rewarding matches
  // alone is not enough to order these photos: almost every reception in the
  // library carries Ivory and White, so a terracotta room and a blue one both
  // scored +4 on linens and the tie fell to vibe or season. That is how a
  // board asking for Something Blue came back showing terracotta tablecloths.
  // Mirrors the vibe penalty above -- pushed down rather than barred, so a
  // slot still fills when the library has nothing closer.
  if (colorTags.length) {
    for (const tag of tags(record, "color")) {
      if (!NEUTRAL_COLOR_TAGS.has(tag) && !colorTags.includes(tag)) score -= 2;
    }
  }

  // Accent metal: +2
  if (state.accent_metal) {
    const metalTag = state.accent_metal === "gold" ? "Gold" : "Silver";
    if (tags(record, "metal").includes(metalTag) || tags(record, "color").includes(metalTag)) score += 2;
  }

  return score;
}

async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set("offset", offset);

    // Next.js's fetch cache has been caught serving a corrupted/truncated
    // cached body here (JSON.parse throwing "Unexpected end of JSON input"
    // with zero real outgoing requests to Airtable) -- that is what made the
    // mood board intermittently show "coming soon" for whole minutes at a
    // time. This call is fast and not hot enough to need caching, so it's
    // disabled rather than risk another corrupted-cache episode.
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable error: ${res.status} ${body}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function POST(req: NextRequest) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ photos: [], spacePhotos: [], barSigns: [] });
    }

    const state: BuilderState = await req.json();
    const photoStyle = state.photography_style; // "airy" | "moody"
    const moodFilter = photoStyle === "airy" ? "Airy" : photoStyle === "moody" ? "Moody" : null;

    const allRecords = await fetchAllRecords();

    const withUrl = allRecords.filter((r) => getImageUrl(r));

    // --- Bar signs: match the couple's chosen drinks against Drinks Tags ---
    const drinkLabels = state.alcohol_opt_out === true
      ? []
      : (state.signature_drinks ?? []).map((v) => labelFor(SIGNATURE_DRINKS, v));
    const barSigns: ScoredPhoto[] = [];
    const usedSigns = new Set<string>();
    for (const drink of drinkLabels) {
      const wanted = normalizeDrink(drink);
      const sign = withUrl.find(
        (r) =>
          !usedSigns.has(r.id) &&
          specificDrinkTags(r).some((t) => normalizeDrink(t) === wanted)
      );
      if (sign) {
        usedSigns.add(sign.id);
        barSigns.push({ id: sign.id, url: getImageUrl(sign)!, name: drink, score: 0 });
      }
    }

    // A couple who has opted out of alcohol should see no cocktails at all.
    // isDrinkPhoto only catches a photo naming a specific drink or filed as a
    // Bar Sign, so a cocktail carrying nothing but the generic "Cocktails" tag
    // slipped through and appeared on a board that asked for sodas and water.
    const teetotal = state.alcohol_opt_out === true;
    const anyDrinkPhoto = (r: AirtableRecord) =>
      tags(r, "drinks").length > 0 ||
      tags(r, "space").some((t) => t === BAR_SIGN_SPACE || t === "Bar Area");

    // --- Style pool: venue photos only, honoring photo style ---
    const stylePool = withUrl.filter((r) => {
      // Keep cocktail close-ups out of the mood board's venue slots.
      if (isDrinkPhoto(r)) return false;
      if (teetotal && anyDrinkPhoto(r)) return false;
      // Mood Tags mixes photographic feel (Airy, Moody) with aesthetic mood
      // (Rustic, Romantic, Elegant). Only drop a photo when it is explicitly
      // tagged the opposite feel, so an untagged-for-feel photo stays eligible.
      if (moodFilter) {
        const moodTags = tags(r, "mood");
        const opposite = moodFilter === "Airy" ? "Moody" : "Airy";
        if (moodTags.includes(opposite) && !moodTags.includes(moodFilter)) return false;
      }
      return true;
    });

    const scored = stylePool
      .map((r) => ({ record: r, score: scoreRecord(r, state) }))
      .sort((a, b) => b.score - a.score);

    // Every venue photo, ignoring the airy/moody filter. The couple's chosen
    // ceremony site must appear on their board, and the filter is why it
    // sometimes could not: the Forest View has two photos in the whole
    // library, so one Moody tag on both puts that site out of reach of an airy
    // couple entirely. Showing them their own ceremony site in the wrong
    // photographic feel beats showing them somewhere they are not getting
    // married.
    const anyVenuePhoto = withUrl
      .filter((r) => !isDrinkPhoto(r))
      .map((r) => ({ record: r, score: scoreRecord(r, state) }))
      .sort((a, b) => b.score - a.score);

    const used = new Set<string>();

    // The same photograph can sit in the library under two records, which have
    // different ids and so survive an id-based check. Comparing the file name
    // catches the duplicate and keeps one board from showing it twice.
    const usedNames = new Set<string>();
    // Everything that identifies the underlying picture. Two records can hold
    // the same photograph under different record names, so the name alone is
    // not enough: the attachment's own filename and byte size, and the Drive
    // link it came from, all catch a copy the name would miss. A blank value
    // is never a key, or one unnamed record would shadow every other.
    const keysOf = (r: AirtableRecord): string[] => {
      const keys: string[] = [];
      // Names and filenames share one namespace, stripped of extension and
      // punctuation, because they are two spellings of the same thing: a
      // record called "Garden Party" holding garden-party.jpg was matching
      // neither on "name:garden party" nor on "file:garden-party.jpg", and
      // the picture reached two slots on one board.
      const pushLabel = (value?: string) => {
        const v = String(value ?? "")
          .trim()
          .toLowerCase()
          .replace(/\.(jpe?g|png|webp|gif|heic)$/i, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        if (v) keys.push(`label:${v}`);
      };
      const push = (prefix: string, value?: string | number) => {
        const v = String(value ?? "").trim().toLowerCase();
        if (v) keys.push(`${prefix}:${v}`);
      };
      pushLabel(r.fields["Image Name"]);
      push("drive", r.fields["Google Drive Link"]);
      const attachment = r.fields["Image Preview"]?.[0];
      pushLabel(attachment?.filename);
      // Last resort, and the only key two copies of one file always share:
      // the byte count. Names, filenames and Drive links can all differ
      // between records holding the identical picture. Two genuinely
      // different photographs matching to the byte is possible but rare
      // enough to be worth the trade against showing one twice.
      push("bytes", attachment?.size);
      return keys;
    };
    const isFresh = (r: AirtableRecord) =>
      !used.has(r.id) && !keysOf(r).some((k) => usedNames.has(k));
    const claim = (r: AirtableRecord) => {
      used.add(r.id);
      for (const k of keysOf(r)) usedNames.add(k);
    };

    // --- Guaranteed space slots: best-scoring photo for each required space ---
    const chosenCeremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
    const spacePhotos: ScoredPhoto[] = [];
    // What the board already shows, recorded from the photo each slot actually
    // chose rather than from the tags its slot would have accepted. The
    // distinction matters: the Ceremony slot accepts "Fireplace Indoor", which
    // around fifty photos carry and most of them are receptions, so treating
    // the whole accepts list as covered blacklists a large part of the library
    // the moment that slot fills.
    const coveredSpaces = new Set<string>();
    for (const { slot, accepts, prefersNot } of SPACE_SLOTS) {
      const inSpace = (s: { record: AirtableRecord }) =>
        isFresh(s.record) && tags(s.record, "space").some((t) => accepts.includes(t));

      // Preferred candidates first, then anything in the space. A slot never
      // goes empty just because every photo carries an avoided tag.
      const preferred = (s: { record: AirtableRecord }) =>
        inSpace(s) && !tags(s.record, "space").some((t) => prefersNot?.includes(t));

      // For the ceremony slot, show the location they actually picked
      // (indoor Fireplace or an outdoor space) before any ceremony photo.
      // Their chosen ceremony location wins, but still prefer an actual
      // ceremony over a head table shot of the same place.
      const atChosenLocation = (s: { record: AirtableRecord }) =>
        ceremonyLocationsOf(s.record).includes(chosenCeremonyTag!);

      // Showing a couple who picked the Forest View a photo of the indoor
      // Fireplace is worse than showing them nothing: it is a different room.
      // Only two photos carry Forest View, so a fallback that accepts any
      // ceremony photo takes over almost immediately. A photo of a known
      // different site is therefore barred outright; one whose site is simply
      // unrecorded is still fair game.
      const notElsewhere = (s: { record: AirtableRecord }) => {
        const locations = ceremonyLocationsOf(s.record);
        return locations.length === 0 || locations.includes(chosenCeremonyTag!);
      };

      const hit =
        slot === "Ceremony" && chosenCeremonyTag
          ? // Their chosen site, in order of how well the photo otherwise
            // suits them, but it is shown either way. The last of these
            // searches the whole library and ignores the airy/moody filter,
            // so the only way this slot misses their site is if the library
            // holds no photo of it at all. Only then does it fall back, and
            // never to a photo of one of the other sites.
            scored.find((s) => preferred(s) && atChosenLocation(s)) ??
            scored.find((s) => inSpace(s) && atChosenLocation(s)) ??
            anyVenuePhoto.find((s) => isFresh(s.record) && atChosenLocation(s)) ??
            scored.find((s) => preferred(s) && notElsewhere(s)) ??
            scored.find((s) => inSpace(s) && notElsewhere(s))
          : scored.find(preferred) ?? scored.find(inSpace);

      if (hit) {
        claim(hit.record);
        for (const t of tags(hit.record, "space")) coveredSpaces.add(t);
        spacePhotos.push({
          id: hit.record.id,
          url: getImageUrl(hit.record)!,
          name: (hit.record.fields["Image Name"] as string) ?? hit.record.id,
          score: hit.score,
          space: slot,
        });
      }
    }

    // --- Three more style-matched photos, spread across the score range ---
    // A photo carrying only other couples' vibes is barred here rather than
    // merely penalised. The picks are taken from fixed positions in the
    // ranking, so a penalty still let a Garden Party tile reach a Colorful
    // Celebration board from further down the list. Photos with no vibe
    // recorded are unaffected: no vibe is not the wrong vibe.
    const chosenVibeTag = VIBE_TAG_MAP[state.vibe ?? ""];
    const rightVibe = (r: AirtableRecord) => {
      if (!chosenVibeTag) return true;
      const recordVibes = tags(r, "vibe");
      return recordVibes.length === 0 || recordVibes.includes(chosenVibeTag);
    };
    // A style pick showing a space the board already has reads as a duplicate
    // even when it is a genuinely different photograph: two shots of the same
    // aisle, one in the Ceremony slot and one again below it, is what a couple
    // sees as the same picture twice. A photo counts as somewhere new only if
    // none of its space tags are covered -- a reception detail shot is still
    // the reception. Photos with no space recorded are unaffected, since no
    // space is not a repeat.
    const showsNewSpace = (r: AirtableRecord) =>
      !tags(r, "space").some((t) => coveredSpaces.has(t));
    const eligible = scored.filter(
      (s) => isFresh(s.record) && rightVibe(s.record) && showsNewSpace(s.record)
    );

    const stylePicks: ScoredPhoto[] = [];
    // Each pick claims, so the key-based duplicate check applies between the
    // style picks themselves and not only against the space slots above. The
    // id comparison this replaced could not see that two records hold one
    // photograph, which is the whole reason keysOf exists.
    const takeStylePick = (s: { record: AirtableRecord; score: number }) => {
      claim(s.record);
      stylePicks.push({
        id: s.record.id,
        url: getImageUrl(s.record)!,
        name: (s.record.fields["Image Name"] as string) ?? s.record.id,
        score: s.score,
      });
    };
    // Freshness is re-checked at pick time rather than trusted from when the
    // list was built: an earlier pick may since have claimed this photograph.
    const pickFrom = (pool: typeof scored, i: number) => {
      const s = pool[i];
      if (s && isFresh(s.record)) takeStylePick(s);
    };

    // Fixed positions in the ranking, so the three picks span the score range
    // instead of clustering at the top, then fill from the top with whatever
    // those positions missed.
    for (const i of [0, 3, 7]) {
      if (stylePicks.length < 3) pickFrom(eligible, i);
    }
    for (let i = 0; stylePicks.length < 3 && i < eligible.length; i++) {
      pickFrom(eligible, i);
    }
    // Deliberately no wider fallback. When the library cannot offer three
    // photos of somewhere the board does not already show, it returns two, or
    // one: the page lays out whatever it is given. A shorter board reads as a
    // deliberate edit, while the same aisle printed twice reads as broken, and
    // padding the count was what put it there in the first place.

    return NextResponse.json({
      // Legacy key: first three images for anything still reading `photos`
      photos: [...spacePhotos, ...stylePicks].slice(0, 3),
      spacePhotos,
      stylePhotos: stylePicks,
      barSigns,
    });
  } catch (err) {
    console.error("Photo fetch error:", err);
    return NextResponse.json({ photos: [], spacePhotos: [], stylePhotos: [], barSigns: [] });
  }
}
