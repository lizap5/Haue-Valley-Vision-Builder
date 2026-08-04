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
