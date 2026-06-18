import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  // Use Metadata API to get field names directly from schema
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${base}/tables`,
    { headers: { Authorization: `Bearer ${key}` } }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: "Metadata API failed", status: res.status, body: data });
  }

  const toursTable = data.tables?.find((t: { id: string; name: string; fields: { name: string; type: string }[] }) => t.id === table);

  if (!toursTable) {
    return NextResponse.json({ error: "Tours table not found", tableId: table, allTables: data.tables?.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })) });
  }

  return NextResponse.json({
    table_name: toursTable.name,
    fields: toursTable.fields.map((f: { name: string; type: string }) => ({ name: f.name, type: f.type })),
  });
}
