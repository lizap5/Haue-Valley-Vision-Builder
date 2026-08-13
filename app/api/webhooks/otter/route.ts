import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { HAUE_VALLEY_VOICE_GUIDE, stripDashes } from "@/lib/haue-valley-voice";

const AIRTABLE_API_KEY        = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID        = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID          = process.env.AIRTABLE_TOURS_TABLE_ID!;
const EMAIL_DRAFTS_TABLE_ID   = process.env.AIRTABLE_EMAIL_DRAFTS_TABLE_ID!;
const OTTER_SIGNING_KEY       = process.env.OTTER_WEBHOOK_SIGNING_KEY ?? "";
const OTTER_WEBHOOK_SECRET    = process.env.OTTER_WEBHOOK_SECRET ?? "";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Auth: HMAC signature (native Otter) OR shared secret token (Zapier bridge)
// ---------------------------------------------------------------------------

function verifyHmac(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  try {
    const expected = createHmac("sha256", OTTER_SIGNING_KEY).update(rawBody).digest("hex");
    const sig = header.startsWith("sha256=") ? header.slice(7) : header;
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function isAuthorized(req: NextRequest, rawBody: string): boolean {
  // Shared-secret token (how Zapier authenticates): header or ?token= query param
  if (OTTER_WEBHOOK_SECRET) {
    const headerToken = req.headers.get("x-webhook-secret");
    const queryToken  = new URL(req.url).searchParams.get("token");
    if (headerToken === OTTER_WEBHOOK_SECRET || queryToken === OTTER_WEBHOOK_SECRET) {
      return true;
    }
  }
  // HMAC signature (native Otter Business webhook)
  if (OTTER_SIGNING_KEY) {
    return verifyHmac(rawBody, req.headers.get("x-hmac-sha256"));
  }
  // No auth configured — allow (dev only). Set OTTER_WEBHOOK_SECRET in production.
  return !OTTER_WEBHOOK_SECRET && !OTTER_SIGNING_KEY;
}

// ---------------------------------------------------------------------------
// Payload types & normalization
// ---------------------------------------------------------------------------

// Native Otter shape (nested) — kept for future Business API use
interface OtterNativePayload {
  meta?: { event?: string };
  data?: {
    id?: string;
    title?: string;
    url?: string;
    owner?: { email?: string; first_name?: string; last_name?: string };
    abstract_summary?: string;
    transcript?: string;
    calendar_guests?: Array<{ email: string; name?: string }>;
  };
}

// Flat shape — what you build in the Zapier "POST" webhook step
interface ZapierFlatPayload {
  transcript?: string;
  title?: string;
  summary?: string;
  url?: string;
  guest_email?: string;
  guest_name?: string;
  couple_names?: string;
  email?: string;
}

// Everything downstream uses this normalized shape
interface NormalizedTour {
  id: string;
  title: string;
  url: string;
  summary: string;
  transcript: string;
  guests: Array<{ email: string; name?: string }>;
}

function normalizePayload(body: OtterNativePayload & ZapierFlatPayload): NormalizedTour {
  // Native nested shape wins if present
  if (body.data?.transcript || body.meta?.event) {
    const d = body.data ?? {};
    const guests = d.calendar_guests ?? [];
    if (d.owner?.email) guests.push({ email: d.owner.email, name: d.owner.first_name });
    return {
      id:         d.id ?? "unknown",
      title:      d.title ?? "",
      url:        d.url ?? "",
      summary:    d.abstract_summary ?? "",
      transcript: d.transcript ?? "",
      guests,
    };
  }

  // Flat Zapier shape
  const guests: Array<{ email: string; name?: string }> = [];
  if (body.guest_email) guests.push({ email: body.guest_email, name: body.guest_name });
  if (body.email && body.email !== body.guest_email) guests.push({ email: body.email, name: body.couple_names });

  return {
    id:         "zapier",
    title:      body.title ?? "",
    url:        body.url ?? "",
    summary:    body.summary ?? "",
    transcript: body.transcript ?? "",
    guests,
  };
}

// ---------------------------------------------------------------------------
// Airtable helpers
// ---------------------------------------------------------------------------

interface ToursRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function findToursByEmail(email: string): Promise<ToursRecord | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0] ?? null;
}

async function findToursByName(name: string): Promise<ToursRecord | null> {
  const formula = encodeURIComponent(`FIND(LOWER("${name.toLowerCase()}"), LOWER({Couple Names})) > 0`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0] ?? null;
}

async function updateToursRecord(recordId: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      // typecast lets Airtable accept a select value (e.g. "Tour Status":
      // "Toured") even if it doesn't exactly match an existing option,
      // instead of rejecting the whole PATCH — including the tour notes,
      // sentiment, etc. that came with it — over one mismatched field.
      body: JSON.stringify({ fields, typecast: true }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Otter webhook: Tours update failed for ${recordId}:`, body);
  }
}

async function createEmailDraft(fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EMAIL_DRAFTS_TABLE_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: true }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Otter webhook: email draft create failed:", body);
  }
}

// ---------------------------------------------------------------------------
// Claude transcript analysis
// ---------------------------------------------------------------------------

interface TourInsights {
  summary: string;
  couple_names_mentioned: string;
  email_mentioned: string;
  guest_count_confirmed: string;
  budget_confirmed: string;
  spaces_liked: string;
  spaces_concerned: string;
  all_inclusive_discussed: boolean;
  key_questions: string;
  next_steps: string;
  overall_sentiment: "very_positive" | "positive" | "neutral" | "uncertain" | "negative";
}

async function analyzeTranscript(transcript: string, title: string, summary: string): Promise<TourInsights> {
  const prompt = `You are analyzing a recorded venue tour transcript for Haue Valley Weddings, a private estate wedding venue in Pacific, MO. Extract structured insights from this tour.

Meeting title: ${title || "Venue Tour"}
${summary ? `Otter.ai summary: ${summary}` : ""}

Transcript:
${transcript}

Extract the following as a JSON object with exactly these keys:
- summary: 2-3 sentence plain-English summary of how the tour went and where the couple landed
- couple_names_mentioned: names as spoken in the conversation (empty string if unclear)
- email_mentioned: any email address spoken aloud during the tour (empty string if none)
- guest_count_confirmed: guest count as confirmed or updated during the tour (empty string if not discussed)
- budget_confirmed: any budget figure mentioned (empty string if not discussed)
- spaces_liked: which ceremony or reception spaces they responded positively to (empty string if unclear)
- spaces_concerned: any spaces or features they had hesitations about (empty string if none)
- all_inclusive_discussed: true if all-inclusive packages were discussed, false otherwise
- key_questions: the most important questions they asked, comma-separated (empty string if none)
- next_steps: any specific follow-up actions mentioned (empty string if none)
- overall_sentiment: one of "very_positive", "positive", "neutral", "uncertain", "negative" based on how excited the couple seemed

Return only valid JSON. No markdown, no explanation.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  return JSON.parse(raw) as TourInsights;
}

// ---------------------------------------------------------------------------
// Claude follow-up email draft generation
// ---------------------------------------------------------------------------

interface DraftEmail {
  subject: string;
  body: string;
  reviewer_notes: string;
}

async function generateFollowUpDraft(
  insights: TourInsights,
  tourRecord: ToursRecord
): Promise<DraftEmail> {
  const f = tourRecord.fields;
  const coupleNames   = (f["Couple Names"] as string) || insights.couple_names_mentioned || "there";
  const firstName     = coupleNames.split(/[&,]/)[0].trim();
  // Checked one by one against the live Tours schema. "Vibe", "Aisle Flowers",
  // "Arch Selection", "Linen Colors", "Accent Metal" and "Signature Drinks"
  // are not columns on that table and never have been, so those reads have
  // returned "" since they shipped and the drafts lost the context silently.
  // The real columns: the vibe is "Style Name", linens are "Colors Chosen",
  // and the arch and aisle picks have no column of their own, arriving folded
  // into "Additional Notes" as labelled lines by builder/submit.
  const vibe          = (f["Style Name"] as string) || (f["Room Feeling"] as string) || "";
  const season        = (f["Season"] as string) || "";
  const ceremony      = (f["Ceremony Location"] as string) || "";
  const linens        = (f["Colors Chosen"] as string) || "";
  const priority      = (f["The One Thing"] as string) || "";
  // "Signature Drink" is singular on Tours and is a real column, so this
  // fallback was already working. Keep it: dropping it for "Favorite Drinks"
  // alone would lose the drinks on any record where the singular is the one
  // that got filled in.
  const drinks        = (f["Favorite Drinks"] as string) || (f["Signature Drink"] as string) || "";
  const decorNotes    = (f["Additional Notes"] as string) || "";

  const visionContext = [
    vibe       && `Their chosen vibe: ${vibe}`,
    season     && `Season: ${season}`,
    ceremony   && `Ceremony space preference before the tour: ${ceremony}`,
    linens     && `Linen and napkin colors: ${linens}`,
    priority   && `The one thing that mattered most to them: ${priority}`,
    drinks     && `Signature drinks they chose: ${drinks}`,
    decorNotes && `Decor picks and notes from their vision builder submission: ${decorNotes}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are drafting a follow-up email for Haue Valley Weddings, a private estate wedding venue in Pacific, MO. This email will be reviewed by the Haue Valley team before being sent to the couple.

${HAUE_VALLEY_VOICE_GUIDE}

STRICT RULES — any violation means the draft is rejected:
- Only reference information that was explicitly discussed during the tour transcript
- You may reference vision builder details ONLY if they align with or were confirmed during the tour
- Do not make any promises about pricing, availability, or packages
- Do not offer or imply anything that was not discussed on the tour
- Do not invent details, feelings, or moments not present in the transcript
- Warm but not effusive. Genuine. Like a thoughtful note from someone who just spent an hour with them.
- Sign off as: Kristin & the Haue Valley Team
- Plain text only — no markdown, no bullet points, no headers

TOUR INSIGHTS:
Summary: ${insights.summary}
Spaces they liked: ${insights.spaces_liked || "not specified"}
Spaces with concerns: ${insights.spaces_concerned || "none noted"}
All-inclusive discussed: ${insights.all_inclusive_discussed ? "yes" : "no"}
Key questions they asked: ${insights.key_questions || "none noted"}
Next steps mentioned: ${insights.next_steps || "none noted"}
Overall sentiment: ${insights.overall_sentiment}

VISION BUILDER CONTEXT (only use if it came up or aligns with the tour):
${visionContext || "No vision builder data available"}

Draft a follow-up email to ${firstName}. It should:
1. Open with one specific reference to something that happened or was said on the tour
2. Briefly reflect back what you heard about what matters to them — only from the transcript
3. If next steps were discussed, reference them naturally
4. Close with an open, low-pressure invitation to reach out with questions
5. Keep it to 3-4 short paragraphs maximum

After the email, output exactly this separator on its own line:
---REVIEWER NOTES---
Then write 1-3 brief notes for the human reviewer flagging anything they should verify, personalize further, or be cautious about before sending. Be specific.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const [emailPart, notesPart] = raw.split("---REVIEWER NOTES---");

  const body    = stripDashes((emailPart ?? "").trim());
  const subject = `Thank you for touring Haue Valley, ${firstName}`;

  return {
    subject,
    body,
    reviewer_notes: (notesPart ?? "").trim() || "Please review before sending.",
  };
}

// ---------------------------------------------------------------------------
// Sentiment → readable label
// ---------------------------------------------------------------------------

const SENTIMENT_LABELS: Record<string, string> = {
  very_positive: "Very positive — ready to book",
  positive:      "Positive",
  neutral:       "Neutral",
  uncertain:     "Uncertain — needs follow-up",
  negative:      "Not a fit",
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isAuthorized(req, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: OtterNativePayload & ZapierFlatPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Ignore non-completion events from the native Otter webhook.
  // Zapier only fires on completed conversations, so no meta.event = allow.
  if (payload.meta?.event && payload.meta.event !== "conversation.completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = normalizePayload(payload);
  const transcript = data.transcript;

  if (!transcript.trim()) {
    return NextResponse.json({ ok: false, error: "Empty transcript" }, { status: 400 });
  }

  try {
    // Analyze transcript
    const insights = await analyzeTranscript(
      transcript,
      data.title,
      data.summary
    );

    // Find matching Tours record (full record, not just ID)
    let tourRecord: ToursRecord | null = null;

    for (const guest of data.guests) {
      if (guest.email) {
        tourRecord = await findToursByEmail(guest.email);
        if (tourRecord) break;
      }
    }

    if (!tourRecord && insights.email_mentioned) {
      tourRecord = await findToursByEmail(insights.email_mentioned);
    }

    if (!tourRecord && insights.couple_names_mentioned) {
      const firstName = insights.couple_names_mentioned.split(/[&,]/)[0].trim();
      if (firstName) tourRecord = await findToursByName(firstName);
    }

    // Update Tours record with tour insights
    const tourFields: Record<string, unknown> = {
      "Tour Status":             "Toured",
      "Tour Notes":              insights.summary,
      "Spaces Liked":            insights.spaces_liked || undefined,
      "Spaces Concerned":        insights.spaces_concerned || undefined,
      "Key Questions":           insights.key_questions || undefined,
      "Next Steps":              insights.next_steps || undefined,
      "Post-Tour Sentiment":     SENTIMENT_LABELS[insights.overall_sentiment] ?? insights.overall_sentiment,
      "All-Inclusive Discussed": insights.all_inclusive_discussed,
      "Otter Transcript URL":    data.url || undefined,
    };
    if (insights.guest_count_confirmed) tourFields["Guest Count Confirmed"] = insights.guest_count_confirmed;
    if (insights.budget_confirmed)      tourFields["Budget Confirmed"]      = insights.budget_confirmed;

    const cleanTourFields = Object.fromEntries(
      Object.entries(tourFields).filter(([, v]) => v !== undefined && v !== "")
    );

    if (tourRecord) {
      await updateToursRecord(tourRecord.id, cleanTourFields);
      console.log(`Otter webhook: updated Tours record ${tourRecord.id}`);
    } else {
      console.warn(`Otter webhook: no Tours record found for conversation ${data.id}`);
    }

    // Generate follow-up email draft and write to Email Drafts table
    if (tourRecord && EMAIL_DRAFTS_TABLE_ID) {
      const draft = await generateFollowUpDraft(insights, tourRecord);
      const coupleEmail = (tourRecord.fields["Email"] as string) || insights.email_mentioned || "";
      const coupleNames = (tourRecord.fields["Couple Names"] as string) || insights.couple_names_mentioned || "";

      await createEmailDraft({
        "Couple Names":    coupleNames,
        "To Email":        coupleEmail,
        "Subject":         draft.subject,
        "Email Body":      draft.body,
        "Tour Record ID":  tourRecord.id,
        "Status":          "Draft",
        "Reviewer Notes":  draft.reviewer_notes,
        "Created":         new Date().toISOString().split("T")[0],
      });

      console.log(`Otter webhook: created email draft for ${coupleNames}`);
    }

    return NextResponse.json({
      ok: true,
      matched: !!tourRecord,
      recordId: tourRecord?.id ?? null,
      sentiment: insights.overall_sentiment,
      draftCreated: !!tourRecord && !!EMAIL_DRAFTS_TABLE_ID,
    });
  } catch (err) {
    console.error("Otter webhook processing error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
