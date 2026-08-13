# Haue Valley Vision Builder — working notes

## Deployment topology

- Vercel project: **`haue-valley-vision-builder`** (team `empower-your-ai-s-projects`).
  A second project, `haue-valley-vision-builder-gn1s`, was connected to the same
  repo with no environment variables and produced a permanently broken parallel
  preview on every push. It has been disconnected. If two preview URLs ever
  appear again for one branch, that is the cause.
- Production builds from **`main`** and serves `haue-valley-vision-builder.vercel.app`.
  The root path is a "Coming soon" splash; the tool lives at `/builder`.
- Feature work happens on **`claude/nice-turing-w4uid3`**, which gets its own
  preview deployment. Vercel truncates the project name in branch aliases, so
  the host reads `haue-valley-vision-builde-git-...` with no "r".

## Environment variables

- Vercel **snapshots env vars at build time**. Adding or changing one does not
  affect any existing deployment. After saving a variable you must **redeploy
  the branch that needs it**. Redeploying Production does not help a preview,
  and `main` does not contain the admin routes at all.
- `ADMIN_TOKEN` is marked **Sensitive**, so its value cannot be read back from
  the dashboard by anyone. Never assume you know it or can look it up. Ask.

## What Claude cannot do here

The sandbox has no network path to Vercel, Airtable, Google Drive, or
hauevalleyweddings.com — the agent proxy returns 403 for all of them. On top of
that, preview deployments sit behind Vercel Authentication (Standard
Protection), so any request without a Vercel login gets a 302 to the login page
rather than the route.

**Consequence: hand the user URLs to paste into their browser. Do not attempt to
call these endpoints, and do not report a result you have not been shown.**
Changing this would require setting up a Protection Bypass secret in Vercel,
which has not been done.

## Admin routes

Both live under `/api/admin`, are token-protected, and work a batch per request
so each one finishes inside the serverless time limit. Each response reports how
many records remain; keep reloading until `remaining` is 0.

- `backfill-previews` — fills the `Image Preview` attachment field from
  `Google Drive Link`. Airtable then hosts its own copy, which is far more
  reliable than a Drive URL. Up to 30 records per call (`limit`, max 50).
- `tag-images` — auto-tags with Claude vision. **Preserves any column that
  already has a value**; only empty columns get filled. `overwrite=1` replaces
  everything. Up to 6 per call (`limit`, max 12) — each image costs a download
  plus a vision call, and the loop stops at 45s and saves what it finished
  rather than risk a timeout discarding the batch.
- `import-drive` — creates an Airtable row for every image in the watched
  Drive folder that does not have one yet, keyed on the Drive file id so a
  re-run cannot duplicate. Up to 25 rows per call (`limit`, max 50). **Runs
  automatically as the first step of `backfill-previews`**, so no third cron
  job is needed — Hobby allows only two and both are spoken for. That step is
  fail-soft: if Drive is unreachable or the key is unset, the backfill still
  runs, and the outcome appears under `driveImport` in the response.
- `audit-library` — read-only inventory. Writes nothing.

Both accept `dry=1` to report without writing.

Status: **complete**. 170 records, 169 with previews and tags, 0 awaiting.
The one skip has no image file at all, so it is excluded rather than failing.
Mood board slot coverage: Ceremony 83, Reception 74, Details 79.

The count fell from 181 because linen swatch, accent metal, and screenshot
images had been added to the library. **Those do not belong in Airtable.** The
mood board draws its swatch card and metal chip from `LINEN_COLORS` hex and a
CSS gradient in `app/builder/result/page.tsx`, not from any photo, so such
records are used by nothing while remaining eligible for the collage's photo
slots — a couple could be shown a flat square of fabric as their reception
photo. They were deleted from Airtable and moved out of the watched Drive
folder, since the Zap would otherwise recreate them.

### Scheduled runs

`vercel.json` runs both routes **weekly on Monday, backfill at 08:00 UTC and
tagging at 10:00 UTC**, so images added to Airtable get picked up without
anyone opening a URL. Caveats:

- **On Hobby, Vercel may invoke a cron job anywhere within its scheduled
  hour.** Two jobs in the same hour fire in arbitrary order. Tagging depends on
  the attachment that backfill creates, so they must sit in **different hours**
  or tagging can run first and skip that week's new photos. Do not narrow the
  gap back down.
- **Vercel Cron only runs against Production**, so these do nothing until the
  branch is merged to `main`.
- Cron cannot put a secret in the path. It sends
  `Authorization: Bearer $CRON_SECRET`, so **`CRON_SECRET` must be set** in
  Vercel or the scheduled calls return 401. `ADMIN_TOKEN` still works for
  URLs pasted by hand. Add the variable, **then redeploy Production** — env
  vars are snapshotted at build time.
- Each run is bounded: 50 previews and **12 tagged images**. A weekly schedule
  therefore clears about 12 new photos a week. After a bulk upload, run the
  `tag-images` URL by hand a few times rather than waiting weeks for the
  schedule to catch up.

The Hobby plan allows 2 cron jobs at most once per day each; weekly is well
inside that.

### Post-merge check: did cron actually fire?

This project has Vercel Authentication enabled. Standard Protection should
leave the Production domain public, but **cron jobs do not follow redirects and
are never retried**, so if protection does intercept the call the job no-ops
silently, forever, with no error raised anywhere.

After the first Monday following a merge, open **Settings → Cron Jobs → View
Logs**. A 200 means it worked. **A 401 or any 3xx means protection is
intercepting**, and the fix is a Protection Bypass secret in Vercel.

### Re-runnability

Both routes only ever fill blanks, so a duplicated or missed run is harmless:

- `backfill-previews` selects records whose `Image Preview` is empty. Writing an
  attachment replaces the whole array rather than appending, so even a
  simultaneous double-run cannot produce duplicates.
- `tag-images` in its default preserve mode skips any column that already holds
  a value, and treats a record as done once **`Setting Tags` or `Vibe Tags`** is
  populated. `Setting Tags` is the reliable marker because the prompt requires
  exactly one of Indoor/Outdoor for every photo. `Vibe Tags` alone would not
  work: it is legitimately empty for a photo matching no vibe, so such records
  would be re-tagged every single week and quietly burn vision calls forever.

A missed run simply means the work waits until the following Monday.

### Drive ingestion

`import-drive` closes what used to be the manual gap: a photo dropped in the
watched folder now becomes an Airtable row, a preview and a set of tags without
anyone opening Airtable.

It lists the folder's **current contents** every run and creates whatever is
missing, rather than reacting to an upload event. That matters, because the
Zapier "New File in Folder" trigger this replaces silently misses files that
were *moved* into the folder rather than uploaded to it. Here a file that
arrives by any route is picked up on the next pass.

**Do not run both this and a Zap** pointed at the same folder, or every new
photo gets two rows.

Still only one folder deep: the query asks for direct children, so the flat
folder rule the library already depends on continues to apply. Subfolders are
invisible.

Requires two variables, and the folder must stay shared "anyone with the link"
— which it already must be, or the mood board could not render Drive
thumbnails:

- `GOOGLE_DRIVE_FOLDER_ID` — from the folder's URL.
- `GOOGLE_DRIVE_API_KEY` — a Google Cloud API key with the Drive API enabled.

Without them the import step is skipped and the rest carries on unchanged.

## Airtable image library

Table "Images" in the `Image Tag Index` base. The tag vocabulary the code reads
lives in `lib/image-tagging.ts` and `app/api/builder/photos/route.ts`; keep them
in step.

- Column names are read through an **alias list**, so `Vibes` and `Vibe Tags`
  both work.
- Writes use `typecast`, so Airtable creates a select option that does not
  exist yet instead of rejecting the batch. That is only safe because the
  tagger filters model output against a fixed vocabulary first — the two
  belong together. **Deleting an option in Airtable does not remove it: it
  must also come out of the vocabulary, or the next run recreates it.**
- `Space Tags` uses a granular in-house vocabulary (`Head Table`, `Dance Floor`,
  `Ceremony Area - Stone Wall`, …). Board slots map onto several values each
  rather than requiring a rename.
- The mood board's three slots are **Ceremony, Reception, Details**. `Upper
  Patio` was dropped: no photo ever carried it, so the slot always read
  "coming soon". It is also removed from the tagger vocabulary, because
  `typecast` would otherwise recreate the option in Airtable on the next run.
- `Mood Tags` mixes photographic feel (`Airy`, `Moody`) with aesthetic mood
  (`Rustic`, `Romantic`, `Elegant`). The airy/moody filter therefore excludes a
  photo only when it explicitly carries the opposite feel.
- **The tagger never writes `Drinks Tags`.** It is read through the alias list
  but is not in the vocabulary the model produces, so drink names must be typed
  by hand or a bar sign will never match a couple's selection. All eight
  calculator drinks are now covered. Matching normalizes case, punctuation and
  ampersands, so `Whiskey & Coke` and `Gin & Tonic` both resolve correctly; the
  generic `Signature Drink` and `Cocktails` are ignored because every drink
  photo carries them.
- `Color Tags` and `LINEN_COLORS` deliberately do **not** match. Color tags are
  broad colors visible in a photo (`Purple`, `Blue`, `Gold`); linen colors are
  orderable fabrics (`Eggplant`, `Slate Blue`, `Maize Yellow`). A photograph
  does not contain "Maize Yellow", and asking vision to tell Lilac from Eggplant
  across varying light would produce confident nonsense. `LINEN_COLOR_TAG_MAP`
  in `app/api/builder/photos/route.ts` bridges the two, most linens mapping to
  two tags so a near miss still scores. Renaming the Airtable options to the
  linen names silently breaks that scoring.

## Still outstanding

- Nothing yet verifies that the weekly cron actually fired. See the post-merge
  check above.

## Tile images

All **31** are present and verified in the preview. `npm run check:tiles` lists
any that go missing and regenerates `lib/tile-manifest.generated.ts`, which is
committed — run it after touching `public/images` or the manifest drifts.

Filenames are **not** uniform, because the code was pointed at whatever was
uploaded rather than making anyone rename files. `lib/calculator-options.ts`
holds the real paths; do not assume a slug from a label. In particular the arch
and aisle sets share three names (`cassian`, `feyre`, `gwen`) and are told apart
only by an `-arch` / `-aisle` suffix, so a file dropped in the wrong folder
shows couples the wrong arrangement without erroring.

Linen colors are **not** images. `LINEN_COLORS` in `lib/calculator-options.ts`
carries 17 hex values matching the venue's color card, rendered as CSS swatches.
The hexes were sampled by eye from a screenshot of that card, not from supplier
specs, so they are close but not colorimetric.
