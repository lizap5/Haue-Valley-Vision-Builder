import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  // Fetch one record to see exact field names Airtable has
  const res = await fetch(
    `https://api.airtable.com/v0/${base}/${table}?maxRecords=1`,
    { headers: { Authorization: `Bearer ${key}` } }
  );

  const data = await res.json();
  const fields = data.records?.[0]?.fields ?? {};

  return NextResponse.json({
    field_names: Object.keys(fields),
    sample_record: fields,
  });
}
