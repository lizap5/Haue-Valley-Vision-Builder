import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID   = process.env.AIRTABLE_TOURS_TABLE_ID!;

export async function POST(req: NextRequest) {
  try {
    const { email, vision_copy, style_name } = await req.json();

    if (!email || !vision_copy) {
      return NextResponse.json({ ok: false, error: "Missing email or vision_copy" });
    }

    // Find the most recent record for this email
    const formula = encodeURIComponent(`{Email} = "${email}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!searchRes.ok) {
      return NextResponse.json({ ok: false, error: "Airtable search failed" });
    }

    const searchData = await searchRes.json();
    const recordId = searchData.records?.[0]?.id;

    if (!recordId) {
      return NextResponse.json({ ok: false, error: "No record found for email" });
    }

    const patchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}/${recordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Vision Copy":  vision_copy,
            "Style Name":   style_name ?? "",
          },
        }),
      }
    );

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.error("Vision copy update error:", err);
      return NextResponse.json({ ok: false, error: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true, recordId });
  } catch (err) {
    console.error("update-vision error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
