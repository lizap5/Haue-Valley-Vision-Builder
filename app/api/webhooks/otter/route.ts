import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID   = process.env.AIRTABLE_TOURS_TABLE_ID!;
const OTTER_SIGNING_KEY = process.env.OTTER_WEBHOOK_SIGNING_KEY ?? "";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, header: string | null): boolean {
  if (!OTTER_SIGNING_KEY) return true; // skip if not configured yet
  if (!header) return false;
  try {
    const expected = createHmac("sha256", OTTER_SIGNING_KEY).update(rawBody).digest("hex");
    const sig = header.startsWith("sha256=") ? header.slice(7) : header;
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Otter.ai payload types
// ---------------------------------------------------------------------------

interface OtterPayload {
  meta: {
    event: string;
  };
  data: {
    id: string;
    title?: string;
    url?: string;
    owner?: { email?: string; first_name?: string; last_name?: string };
    abstract_summary?: string;
    action_items?: Array<{ text: string }>;
    transcript?: string;
    calendar_guests?: Array<{ email: string; name?: string }>;
  };
}

// ---------------------------------------------------------------------------
// Airtable helpers
// ---------------------------------------------------------------------------

async function findRecordByEmail(email: string): Promise<string | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0]?.id ?? null;
}

async function findRecordByName(name: string): Promise<string | null> {
  // Partial match on Couple Names — useful when email isn't in Otter guests
  const formula = encodeURIComponent(`FIND(LOWER("${name.toLowerCase()}"), LOWER({Couple Names})) > 0`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0]?.id ?? null;
}

async function updateAirtableRecord(recordId: string, fields: Record<string, unknown>): Promise<void> {
  await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
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
  const signature = req.headers.get("x-hmac-sha256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: OtterPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle completed conversations
  if (payload.meta?.event !== "conversation.completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = payload.data;
  const transcript = data.transcript ?? "";

  if (!transcript.trim()) {
    return NextResponse.json({ ok: false, error: "Empty transcript" }, { status: 400 });
  }

  try {
    // Analyze transcript with Claude
    const insights = await analyzeTranscript(
      transcript,
      data.title ?? "",
      data.abstract_summary ?? ""
    );

    // Find the matching Airtable record
    // Try calendar guests first, then email mentioned in transcript, then name
    let recordId: string | null = null;

    for (const guest of data.calendar_guests ?? []) {
      if (guest.email) {
        recordId = await findRecordByEmail(guest.email);
        if (recordId) break;
      }
    }

    if (!recordId && insights.email_mentioned) {
      recordId = await findRecordByEmail(insights.email_mentioned);
    }

    if (!recordId && insights.couple_names_mentioned) {
      // Try first name from the pair (e.g. "Emma & James" → try "Emma")
      const firstName = insights.couple_names_mentioned.split(/[&,]/)[0].trim();
      if (firstName) recordId = await findRecordByName(firstName);
    }

    // Build the Airtable update fields
    const fields: Record<string, unknown> = {
      "Tour Status":            "Toured",
      "Tour Notes":             insights.summary,
      "Spaces Liked":           insights.spaces_liked || undefined,
      "Spaces Concerned":       insights.spaces_concerned || undefined,
      "Key Questions":          insights.key_questions || undefined,
      "Next Steps":             insights.next_steps || undefined,
      "Post-Tour Sentiment":    SENTIMENT_LABELS[insights.overall_sentiment] ?? insights.overall_sentiment,
      "All-Inclusive Discussed": insights.all_inclusive_discussed,
      "Otter Transcript URL":   data.url || undefined,
    };

    // Update confirmed details if they were discussed
    if (insights.guest_count_confirmed) fields["Guest Count Confirmed"] = insights.guest_count_confirmed;
    if (insights.budget_confirmed)       fields["Budget Confirmed"]      = insights.budget_confirmed;

    // Strip undefined values
    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined && v !== "")
    );

    if (recordId) {
      await updateAirtableRecord(recordId, cleanFields);
      console.log(`Otter webhook: updated Airtable record ${recordId} for conversation ${data.id}`);
    } else {
      console.warn(`Otter webhook: no Airtable record found for conversation ${data.id} — logging insights only`);
    }

    return NextResponse.json({
      ok: true,
      matched: !!recordId,
      recordId,
      sentiment: insights.overall_sentiment,
    });
  } catch (err) {
    console.error("Otter webhook processing error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
