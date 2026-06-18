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

  // Only singleLineText + checkbox fields — no singleSelect — to avoid option mismatch
  const testFields = {
    "Couple Names": "Debug Test",
    "Email": "debug@test.com",
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
      table_id: table,
      base_id: base,
    });
  } catch (err) {
    return NextResponse.json({ error: "Fetch threw", detail: String(err) });
  }
}
