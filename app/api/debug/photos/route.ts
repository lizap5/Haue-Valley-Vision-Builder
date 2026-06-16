import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  const url = `https://api.airtable.com/v0/${base}/${table}?maxRecords=3`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const data = await res.json();

  // Summarize what's in each record's image fields
  const summary = data.records?.map((r: { id: string; fields: Record<string, unknown> }) => ({
    id: r.id,
    name: r.fields["Image Name"],
    driveLink: r.fields["Google Drive Link"] ?? null,
    imagePreview: r.fields["Image Preview"]
      ? (r.fields["Image Preview"] as { url: string }[]).map((a) => a.url)
      : null,
    moodTags: r.fields["Mood Tags"],
  }));

  return NextResponse.json({ summary, raw_first: data.records?.[0] });
}
