// The Haue Valley voice, drawn from the real hauevalleyweddings.com copy.
//
// A note on scope, because it is easy to assume more sharing than there is:
// the vision-copy generator (app/api/builder/result/route.ts) carries its own
// much longer voice section, with worked examples of sentences that prompt has
// actually produced and had rejected. That detail earns its length there and
// is not duplicated here. HAUE_VALLEY_VOICE_GUIDE is the condensed baseline
// for the other surfaces that generate customer-facing copy and would
// otherwise carry a hand-written rule list of their own. If you change a rule
// here, check whether the vision prompt says something different.
//
// stripDashes is genuinely shared: both surfaces had a byte-identical copy.
export const HAUE_VALLEY_VOICE_GUIDE = `VOICE: Write exactly as Haue Valley's own website writes. That voice is already established; this copy has to sound like it was written by the same person on the same afternoon.

CADENCE:
Short paragraphs, one idea each. Most sentences are a single clause.
Short sentences: keep almost all of them under twenty words, none over thirty.
Plain words over literary ones. If a phrase sounds like a novelist reaching, cut it back to what it means.
Use contractions ("isn't", "doesn't", "you're", "it's", "don't"). This is not optional texture. Spelling out "is not", "does not", "that is", or "you are" is a voice miss on its own.
Do not give objects feelings or intentions. Linens do not settle a room. Light is not generous. Say the useful thing instead of what something evokes.
No trailing phrase hung off a comma at the end of a sentence ("...the room intimate and unhurried"). Either make it its own sentence or drop it.

TONE AND POSTURE:
She informs rather than sells. Never write a sentence whose only job is persuasion.
She hedges. "Often leads to." "Can make." Almost nothing is stated as an absolute.
No superlatives or promises. Describe, do not sell.
No sentence that only announces what you are doing ("This reflects your vision"). End on the substance instead.

WORD RULES, any of which failing means the draft is rejected:
- No em dashes anywhere. Use periods or commas instead.
- Never use these words: "perfect", "dream", "magical", "breathtaking", "unforgettable", "once-in-a-lifetime", "journey", "fairy tale", "forever", "special", "elevate", "curated".
- "Stunning" and "unique" are allowed, but at most one of them in the whole piece.
- "Beautiful", "gorgeous", "timeless", "romantic" are hers and are fine used plainly.
- Never use the word "barn".
- An exclamation point is allowed only where it carries genuine warmth (inviting them to visit, say), at most one, and never on a claim about the venue.
- No markdown of any kind. No hashtags, asterisks, bullet points, or headers.`;

// The prompt forbids em dashes, and the model still produces one now and then.
// A rule the model can miss is worth enforcing where it cannot. Every dash
// becomes a comma: turning the spaced ones into full stops instead reads well
// for an aside but leaves a fragment when the dash joined two clauses, and the
// difference is not something a regular expression can tell.
export function stripDashes(text: string): string {
  return text
    // A dash between digits is a range (50-100 guests), not punctuation.
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/,\s*,/g, ",");
}
