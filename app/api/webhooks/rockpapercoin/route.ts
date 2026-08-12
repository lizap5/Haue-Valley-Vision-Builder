import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_API_KEY      = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID      = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID        = process.env.AIRTABLE_TOURS_TABLE_ID!;
const RPC_WEBHOOK_SECRET    = process.env.RPC_WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// Auth: shared-secret token (how Zapier authenticates)
// ---------------------------------------------------------------------------

function isAuthorized(req: NextRequest): boolean {
  if (!RPC_WEBHOOK_SECRET) {
    // No secret configured — allow (dev only). Set RPC_WEBHOOK_SECRET in production.
    return true;
  }
  const headerToken = req.headers.get("x-webhook-secret");
  const queryToken  = new URL(req.url).searchParams.get("token");
  return headerToken === RPC_WEBHOOK_SECRET || queryToken === RPC_WEBHOOK_SECRET;
}

// ---------------------------------------------------------------------------
// Payload — the flat JSON you build in the Zapier "POST" webhook step.
// Map Rock Paper Coin trigger fields onto these keys.
// ---------------------------------------------------------------------------

interface RpcPayload {
  // Which RPC event fired. Accepts a few spellings so the Zap is easy to build.
  event?: string;          // e.g. "contract_sent" | "contract_signed" | "invoice_paid" | "invoice_sent"
  couple_email?: string;   // the client's email in RPC (used to match the Tours record)
  couple_names?: string;   // fallback match if email is missing
  document_name?: string;  // name of the contract / invoice
  document_url?: string;   // link back to the document in RPC
  amount?: string;         // invoice / payment amount, if relevant
  wedding_date?: string;   // event date, if RPC exposes it
}

// Normalize whatever the Zap sends into one of our known event kinds.
type RpcEventKind = "contract_sent" | "contract_signed" | "invoice_sent" | "invoice_paid" | "unknown";

function classifyEvent(raw: string): RpcEventKind {
  const e = raw.toLowerCase();
  if (e.includes("sign") || e.includes("execut") || e.includes("complet")) return "contract_signed";
  if (e.includes("contract") && e.includes("sent"))                        return "contract_sent";
  if (e.includes("paid") || e.includes("payment"))                         return "invoice_paid";
  if (e.includes("invoice"))                                               return "invoice_sent";
  if (e.includes("contract"))                                              return "contract_sent";
  return "unknown";
}

// Each event kind maps to a Booking Status on the Tours record.
const STATUS_BY_EVENT: Record<RpcEventKind, string | null> = {
  contract_sent:   "Contract Out",
  contract_signed: "Booked",
  invoice_sent:    "Invoice Sent",
  invoice_paid:    "Deposit Paid",
  unknown:         null,
};

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
      body: JSON.stringify({ fields, typecast: true }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`RPC webhook: Tours update failed for ${recordId}:`, body);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: RpcPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = classifyEvent(payload.event ?? "");
  const newStatus = STATUS_BY_EVENT[kind];

  if (kind === "unknown" || !newStatus) {
    // Not an event we act on — acknowledge so Zapier doesn't retry.
    return NextResponse.json({ ok: true, ignored: true, event: payload.event ?? null });
  }

  try {
    // Match the couple: email first, then name.
    let tourRecord: ToursRecord | null = null;
    if (payload.couple_email) {
      tourRecord = await findToursByEmail(payload.couple_email);
    }
    if (!tourRecord && payload.couple_names) {
      const firstName = payload.couple_names.split(/[&,]/)[0].trim();
      if (firstName) tourRecord = await findToursByName(firstName);
    }

    if (!tourRecord) {
      console.warn(`RPC webhook: no Tours record found for ${payload.couple_email || payload.couple_names || "unknown"}`);
      return NextResponse.json({ ok: true, matched: false, event: kind });
    }

    const fields: Record<string, unknown> = {
      "Booking Status": newStatus,
    };
    if (payload.document_url)  fields["RPC Document URL"] = payload.document_url;
    if (payload.document_name) fields["RPC Document Name"] = payload.document_name;
    if (payload.wedding_date)  fields["Wedding Date"] = payload.wedding_date;

    // Payment-specific fields
    if (kind === "invoice_paid" && payload.amount) {
      fields["Last Payment Amount"] = payload.amount;
    }

    await updateToursRecord(tourRecord.id, fields);
    console.log(`RPC webhook: ${kind} → set ${tourRecord.id} to "${newStatus}"`);

    return NextResponse.json({
      ok: true,
      matched: true,
      recordId: tourRecord.id,
      event: kind,
      status: newStatus,
    });
  } catch (err) {
    console.error("RPC webhook processing error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
