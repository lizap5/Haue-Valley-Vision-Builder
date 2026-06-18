import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({
      error: "Missing env vars",
      key: !!key,
      base: !!base,
      table: !!table,
    });
  }

  // Test the full payload with real values to surface any field name/option mismatches
  const testFields = {
    "Couple Names": "Debug Test Full",
    "Email": "debug@test.com",
    "Wedding Date": "October 2026",
    "Season": "Fall",
    "Guest Count": "100 – 150",
    "Photo Style": "Light and Airy",
    "Ceremony Location": "Outdoor stone space",
    "Reception Vibe": "Romantic garden party",
    "Florals and Colors": "Soft and neutral",
    "Signature Drink": "Aperol Spritz",
    "Priorities": ["Stunning photography", "A stress-free day"],
    "All-Inclusive Interest": true,
    "Additional Notes": "Debug test - ignore",
    "Vision Builder Completed": true,
    "Submitted At": new Date().toISOString(),
  };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${base}/${table}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: testFields }),
      }
    );

    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      airtable_response: parsed,
    });
  } catch (err) {
    return NextResponse.json({ error: "Fetch threw", detail: String(err) });
  }
}
