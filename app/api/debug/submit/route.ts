import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TOURS_TABLE_ID;

  if (!key || !base || !table) {
    return NextResponse.json({ error: "Missing env vars", key: !!key, base: !!base, table: !!table });
  }

  // Send a full realistic payload matching exactly what the real submit sends
  const res = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        "Couple Names":             "TEST Full - delete me",
        "Email":                    "test@test.com",
        "Wedding Date":             "October 2027",
        "Season":                   "Fall",
        "Guest Count":              "50 – 100",
        "Photography Style":        "Light and Airy",
        "Ceremony Location":        "Outdoor stone space",
        "Reception Vibe":           "Romantic garden party",
        "Florals and Colors":       "Soft and neutral",
        "Signature Drink":          "Lavender gin spritz",
        "Priorities":               ["Amazing food and drinks", "A stress-free day"],
        "All-Inclusive Interest":   false,
        "Additional Notes":         "Test notes",
        "Tour Status":              "Upcoming",
        "Vision Builder Completed": true,
        "Submitted At":             new Date().toISOString(),
      },
    }),
  });

  const body = await res.json();
  return NextResponse.json({ status: res.status, ok: res.ok, body });
}
