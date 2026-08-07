import { NextResponse } from "next/server";
import {
  fetchAllRecords, presentFieldsOf, resolveFieldName, imageUrlOf,
  isAdminAuthorized, unauthorizedReason, AirtableRecord,
} from "@/lib/image-tagging";

export const maxDuration = 60;

// Read-only inventory of the Airtable image library. Writes nothing.
//
// Answers the questions you cannot see from the grid view at a glance:
// how many images are usable, how many are tagged, what the Space Tags
// actually contain, and which drink photos and bar signs already exist.
//
//   /api/admin/audit-library?token=...
export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(unauthorizedReason(req), { status: 401 });
  }

  try {
    const records = await fetchAllRecords();
    const present = presentFieldsOf(records);

    const col = (k: string) => resolveFieldName(k, present);
    const listOf = (r: AirtableRecord, k: string): string[] => {
      const v = r.fields[col(k)];
      return Array.isArray(v) ? (v as string[]) : v ? [String(v)] : [];
    };

    const histogram = (key: string) => {
      const counts: Record<string, number> = {};
      for (const r of records) {
        for (const tag of listOf(r, key)) counts[tag] = (counts[tag] ?? 0) + 1;
      }
      return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
    };

    const hasPreview = (r: AirtableRecord) => {
      const att = r.fields["Image Preview"] as unknown[] | undefined;
      return Boolean(att?.length);
    };
    const isTagged = (r: AirtableRecord) =>
      listOf(r, "setting_tags").length > 0 || listOf(r, "vibe_tags").length > 0;

    const spaceTags = histogram("space_tags");
    const drinkTags = histogram("drinks_tags");

    // Records that look like they belong to the bar: either explicitly tagged
    // as a sign, or carrying a drink name.
    const barRecords = records
      .filter((r) => listOf(r, "space_tags").includes("Bar Sign") || listOf(r, "drinks_tags").length)
      .map((r) => ({
        name: (r.fields["Image Name"] as string) ?? r.id,
        spaces: listOf(r, "space_tags"),
        drinks: listOf(r, "drinks_tags"),
        hasPreview: hasPreview(r),
      }));

    // Slots the mood board must fill, and whether anything can fill them.
    const slotCoverage = {
      Ceremony: records.filter((r) =>
        listOf(r, "space_tags").some((t) =>
          ["Ceremony", "Ceremony Outdoor", "Ceremony - Indoor", "Ceremony Indoor",
           "Ceremony Area - Stone Wall", "Ceremony Area - Forest View",
           "Ceremony Area - Trees", "Fireplace Indoor"].includes(t))).length,
      Reception: records.filter((r) =>
        listOf(r, "space_tags").some((t) => ["Reception", "Head Table", "Dance Floor"].includes(t))).length,
      "Upper Patio": records.filter((r) =>
        listOf(r, "space_tags").some((t) => ["Upper Patio", "Patio"].includes(t))).length,
    };

    const untagged = records.filter((r) => imageUrlOf(r) && !isTagged(r));

    return NextResponse.json({
      ok: true,
      totals: {
        records: records.length,
        withImagePreview: records.filter(hasPreview).length,
        withDriveLinkOnly: records.filter((r) => !hasPreview(r) && r.fields["Google Drive Link"]).length,
        withNoImageAtAll: records.filter((r) => !imageUrlOf(r)).length,
        tagged: records.filter(isTagged).length,
        awaitingTagging: untagged.length,
      },
      // Compare this against the number of files in the Drive folder. Any
      // shortfall is files that have no Airtable row, which nothing here
      // can see or use.
      note: "If the Drive folder holds more files than `records` above, the difference has no Airtable row yet.",
      moodBoardSlotCoverage: slotCoverage,
      spaceTags,
      drinksTags: drinkTags,
      barAndDrinkRecords: barRecords,
      columnsDetected: [...present].sort(),
    });
  } catch (err) {
    console.error("audit-library error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
