/**
 * Haue Valley Display Auto-Launch Worker
 *
 * Runs on Railway as a scheduled or always-on process.
 * Polls the display/status endpoint and opens the display URL
 * on the venue screen machine when a tour window opens.
 *
 * Environment variables required:
 *   SITE_URL          — e.g. https://hauevalley.vercel.app
 *   POLL_INTERVAL_MS  — optional, default 60000 (60 s)
 *
 * The worker simply logs state transitions. The /display/standby
 * page running in a browser on the venue screen handles the actual
 * redirect — this worker acts as a monitor / alert system and can
 * be extended to trigger webhooks, send SMS, etc.
 */

const SITE_URL        = process.env.SITE_URL?.replace(/\/$/, "") ?? "";
const POLL_MS         = parseInt(process.env.POLL_INTERVAL_MS ?? "60000", 10);
const STATUS_ENDPOINT = `${SITE_URL}/api/display/status`;

if (!SITE_URL) {
  console.error("[worker] SITE_URL env var is required");
  process.exit(1);
}

let lastState = null; // "idle" | "active"

async function checkStatus() {
  try {
    const res = await fetch(STATUS_ENDPOINT);
    if (!res.ok) {
      console.warn(`[worker] Status endpoint returned ${res.status}`);
      return;
    }

    const data = await res.json();
    const now  = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    if (data.active) {
      if (lastState !== "active") {
        console.log(`[worker] TOUR ACTIVE — ${data.coupleNames} | ${data.tourDate}`);
        console.log(`[worker] Display URL: ${SITE_URL}/display?couple=${encodeURIComponent(data.coupleNames ?? "")}`);
        if (data.minutesUntilTour > 0) {
          console.log(`[worker] Tour starts in ${data.minutesUntilTour} minute(s)`);
        }
        lastState = "active";
      }
    } else {
      if (lastState === "active") {
        console.log(`[worker] Tour window closed — returning to standby | ${now}`);
      } else if (lastState === null) {
        console.log(`[worker] Haue Valley Display Worker started | ${now}`);
        console.log(`[worker] Polling ${STATUS_ENDPOINT} every ${POLL_MS / 1000}s`);
      }
      lastState = "idle";
    }
  } catch (err) {
    console.error("[worker] Fetch error:", err.message);
  }
}

// Run immediately, then on interval
checkStatus();
setInterval(checkStatus, POLL_MS);
