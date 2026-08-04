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
  everything. Up to 8 per call (`limit`, max 15).

Both accept `dry=1` to report without writing.

Status: the preview backfill is complete (67 records, 66 filled, 0 failures).

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
- Each run is bounded: 50 previews and **15 tagged images**. A weekly schedule
  therefore clears about 15 new photos a week. After a bulk upload, run the
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

### What is still manual

Nothing creates Airtable rows from Google Drive files. A new photo dropped in
Drive is invisible to all of this until a row exists with a `Google Drive Link`.
Wire that up with Zapier ("New File in Folder" → "Create Record"), or add rows
by hand.

Google Drive's **"New File in Folder" trigger is unreliable with subfolders and
with files moved in from elsewhere**. Every image must be uploaded **directly
into one flat folder** — no subfolders, no dragging in from another Drive
location — or the Zap silently misses them.

## Airtable image library

Table "Images" in the `Image Tag Index` base. The tag vocabulary the code reads
lives in `lib/image-tagging.ts` and `app/api/builder/photos/route.ts`; keep them
in step.

- Column names are read through an **alias list**, so `Vibes` and `Vibe Tags`
  both work. Airtable rejects select options that do not already exist, so the
  tagger only ever writes values the table defines.
- `Space Tags` uses a granular in-house vocabulary (`Head Table`, `Dance Floor`,
  `Ceremony Area - Stone Wall`, …). Board slots map onto several values each
  rather than requiring a rename.
- `Mood Tags` mixes photographic feel (`Airy`, `Moody`) with aesthetic mood
  (`Rustic`, `Romantic`, `Elegant`). The airy/moody filter therefore excludes a
  photo only when it explicitly carries the opposite feel.

## Still outstanding

- The 27 tile images under `public/images/{vibes,aisle,arch,ceremony,metal,drinks}`
  are missing. Steps render blank tiles without them, so **do not merge to
  `main` until they are in place**.
- Bar sign images need uploading with `Space Tags = Bar Sign` and a `Drinks Tags`
  value matching the drink name exactly.
