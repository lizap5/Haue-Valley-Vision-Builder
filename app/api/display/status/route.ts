import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID   = process.env.AIRTABLE_TOURS_TABLE_ID!;

// Window: activate display 15 minutes before tour, keep active for 90 minutes after start
const LEAD_MINUTES  = 15;
const TRAIL_MINUTES = 90;

export interface DisplayStatus {
  active: boolean;
  coupleNames?: string;
  tourDate?: string;
  minutesUntilTour?: number;
}

export async function GET() {
  try {
    const now       = new Date();
    const windowStart = new Date(now.getTime() - TRAIL_MINUTES * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() + LEAD_MINUTES  * 60 * 1000).toISOString();

    // Find any tour whose ISO datetime falls within the activation window
    const formula = encodeURIComponent(
      `AND(IS_AFTER({Tour ISO DateTime}, "${windowStart}"), IS_BEFORE({Tour ISO DateTime}, "${windowEnd}"), {Tour Status} = "Scheduled")`
    );

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1&sort[0][field]=Tour ISO DateTime&sort[0][direction]=asc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ active: false });
    }

    const data = await res.json();
    const record = data.records?.[0];

    if (!record) {
      return NextResponse.json({ active: false });
    }

    const tourISO      = record.fields["Tour ISO DateTime"] as string;
    const coupleNames  = record.fields["Couple Names"]      as string;
    const tourDate     = record.fields["Tour Date"]         as string;
    const tourTime     = tourISO ? new Date(tourISO) : null;
    const minutesUntilTour = tourTime
      ? Math.round((tourTime.getTime() - now.getTime()) / 60000)
      : 0;

    const status: DisplayStatus = {
      active: true,
      coupleNames,
      tourDate,
      minutesUntilTour,
    };

    return NextResponse.json(status);
  } catch (err) {
    console.error("Display status error:", err);
    return NextResponse.json({ active: false });
  }
}
