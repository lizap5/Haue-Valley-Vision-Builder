import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  // Try writing a test record
  const res = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        "Couple Names": "TEST - delete me",
        "Email": "test@test.com",
        "Vision Builder Completed": true,
        "Tour Status": "Upcoming",
      },
    }),
  });

  const body = await res.json();
  return NextResponse.json({ status: res.status, ok: res.ok, body });
}
