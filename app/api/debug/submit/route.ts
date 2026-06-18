import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  // Attempt a real test write with a minimal known-good payload
  const testFields = {
    "Couple Names": "Debug Test",
    "Email": "debug@test.com",
    "Tour Status": "Upcoming",
    "Vision Builder Completed": true,
    "Submitted At": new Date().toISOString(),
  };

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

  const data = await res.json();

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    airtable_response: data,
    fields_sent: testFields,
    env: { base, table: table.slice(0, 8) + "..." },
  });
}
