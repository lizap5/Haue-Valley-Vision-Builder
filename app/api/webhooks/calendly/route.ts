import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const AIRTABLE_API_KEY   = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID   = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID     = process.env.AIRTABLE_TOURS_TABLE_ID!;
const SIGNING_KEY        = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? "";

// Calendly signs payloads with HMAC-SHA256 using the signing key
function verifySignature(rawBody: string, header: string | null): boolean {
  if (!SIGNING_KEY || !header) return !SIGNING_KEY; // if no key configured, skip verification
  try {
    const [, signature] = header.split("t=").join("").split(",v1=");
    const expected = createHmac("sha256", SIGNING_KEY).update(rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(signature ?? "", "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// Search Airtable Tours table for a record matching the invitee email
async function findRecordByEmail(email: string): Promise<string | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0]?.id ?? null;
}

async function updateAirtableRecord(recordId: string, tourDate: string, isoDateTime: string): Promise<void> {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Tour Date":         tourDate,
          "Tour ISO DateTime": isoDateTime,
          "Tour Status":       "Scheduled",
        },
        // typecast: don't reject the whole update (including the tour
        // date/time) if "Scheduled" doesn't exactly match an existing
        // Tour Status option.
        typecast: true,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Calendly webhook: Tours update failed for ${recordId}:`, body);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("calendly-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle booking creation events
  const event = payload.event as string;
  if (event !== "invitee.created") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const invitee     = payload.payload as Record<string, unknown>;
    const email       = (invitee.email as string) ?? "";
    const name        = (invitee.name as string) ?? "";
    const scheduledAt = ((invitee.scheduled_event as Record<string, unknown>)?.start_time as string) ?? "";

    if (!email || !scheduledAt) {
      return NextResponse.json({ ok: false, error: "Missing email or start_time" }, { status: 400 });
    }

    // Format tour date as readable string: "Saturday, June 14 at 10:00 AM"
    const tourDate = new Date(scheduledAt).toLocaleString("en-US", {
      weekday: "long",
      month:   "long",
      day:     "numeric",
      hour:    "numeric",
      minute:  "2-digit",
      timeZone: "America/Chicago",
    });

    const recordId = await findRecordByEmail(email);
    if (!recordId) {
      console.warn(`Calendly webhook: no Airtable record found for ${email}`);
      return NextResponse.json({ ok: true, matched: false });
    }

    await updateAirtableRecord(recordId, tourDate, scheduledAt);
    console.log(`Tour scheduled for ${name} (${email}) on ${tourDate} — Airtable record ${recordId} updated`);

    return NextResponse.json({ ok: true, matched: true, tourDate });
  } catch (err) {
    console.error("Calendly webhook error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
