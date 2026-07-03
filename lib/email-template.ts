import { BuilderState } from "./builder-state";

interface VisionContent {
  heading: string;
  style_name: string;
  vision: string;
  all_inclusive_paragraph: string;
}

const COLORS = {
  green:    "#4A5733",
  sage:     "#6B7355",
  charcoal: "#2C2C2C",
  linen:    "#E8E3D9",
  tan:      "#C4A47C",
  white:    "#FFFFFF",
  offwhite: "#FAF8F5",
};

function visionParagraphsHtml(vision: string): string {
  return vision
    .split("\n\n")
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:400;line-height:1.75;color:${COLORS.charcoal};">${p}</p>`
    )
    .join("");
}

export function buildVisionEmail(state: BuilderState, content: VisionContent): string {
  const coupleNames = content.heading.replace(", this is your Haue Valley wedding.", "");
  const paragraphs = visionParagraphsHtml(content.vision);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${coupleNames} — Your Haue Valley Vision</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.offwhite};-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${COLORS.offwhite};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:${COLORS.white};">

          <!-- Top rule -->
          <tr>
            <td style="height:3px;background-color:${COLORS.green};"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 48px 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:${COLORS.green};">HAUE VALLEY</p>
              <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.25em;text-transform:uppercase;color:${COLORS.sage};">Weddings &amp; Events</p>
              <!-- Divider -->
              <table width="40" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto 0;">
                <tr><td style="height:1px;background-color:${COLORS.linen};"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Style name -->
          <tr>
            <td align="center" style="padding:0 48px 8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.35em;text-transform:uppercase;color:${COLORS.sage};">${content.style_name}</p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding:0 48px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;line-height:1.35;color:${COLORS.charcoal};">${content.heading}</h1>
            </td>
          </tr>

          <!-- Linen divider -->
          <tr>
            <td style="padding:0 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="height:1px;background-color:${COLORS.linen};"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Vision paragraphs -->
          <tr>
            <td style="padding:36px 48px 0;">
              ${paragraphs}
            </td>
          </tr>

          <!-- All-inclusive paragraph -->
          <tr>
            <td style="padding:4px 48px 36px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:1.7;color:${COLORS.sage};">${content.all_inclusive_paragraph}</p>
            </td>
          </tr>

          <!-- Linen divider -->
          <tr>
            <td style="padding:0 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="height:1px;background-color:${COLORS.linen};"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Tour bridge copy -->
          <tr>
            <td align="center" style="padding:36px 48px 28px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:400;line-height:1.75;color:${COLORS.charcoal};text-align:center;">Reading this is one thing. Standing in the space is another. We would love to show you around and let you decide if Haue Valley feels right for you.</p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:0 48px 48px;">
              <a href="${process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://hauevalleyweddings.com/contact"}"
                 style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.white};background-color:${COLORS.green};text-decoration:none;padding:16px 40px;">
                Schedule Your Tour
              </a>
            </td>
          </tr>

          <!-- Summary of their choices -->
          <tr>
            <td style="padding:0 48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${COLORS.offwhite};padding:24px 28px;">
                <tr>
                  <td>
                    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:${COLORS.sage};">YOUR VISION AT A GLANCE</p>
                    ${buildSummaryRows(state)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom rule -->
          <tr>
            <td style="height:1px;background-color:${COLORS.linen};"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 48px 32px;">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:400;letter-spacing:0.3em;text-transform:uppercase;color:${COLORS.sage};opacity:0.7;">Haue Valley Weddings &amp; Events</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.sage};opacity:0.5;">Pacific, MO</p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

const ROOM_FEELING_LABELS: Record<string, string> = {
  romantic: "Swept away / Romantic",
  elegant:  "Elevated / Elegant",
  rustic:   "Right at home / Rustic",
  dramatic: "Amazed / Dramatic",
  garden:   "Enchanted / Garden",
};

const FLORAL_STYLE_LABELS: Record<string, string> = {
  roses:        "Full and lush — roses, peonies, and romantic blooms",
  greenery:     "Fresh and organic — lush greenery, ferns, and natural textures",
  white_blooms: "Clean and ethereal — white blooms, ivory, and soft neutrals",
  hydrangea:    "Garden and abundant — hydrangea, wildflowers, and loose arrangements",
};

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall:   "Fall",
  winter: "Winter",
  unsure: "Not yet decided",
};

const CEREMONY_LABELS: Record<string, string> = {
  stone_wall:        "The Stone Wall",
  forest_view:       "The Forest View",
  indoor_fireplace:  "Indoor by the Fireplace",
  unsure:            "Undecided",
};

const PRIORITY_LABELS: Record<string, string> = {
  photographs:      "Photographs we'll look at forever",
  guest_experience: "Every guest feels taken care of",
  atmosphere:       "A space that takes your breath away",
  stress_free:      "A day we actually get to enjoy",
  food_drink:       "Food and drinks that wow",
  all_inclusive:    "Everything handled, start to finish",
};

const GUEST_COUNT_LABELS: Record<number, string> = {
  50:  "Under 50",
  100: "50 – 100",
  150: "100 – 150",
  200: "150 – 200",
  201: "200+",
};

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.05em;color:#6B7355;white-space:nowrap;padding-right:16px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;color:#2C2C2C;line-height:1.5;">${value}</td>
  </tr>`;
}

function buildSummaryRows(state: BuilderState): string {
  const guestLabel = state.guest_count ? GUEST_COUNT_LABELS[state.guest_count] : undefined;
  const colorsLabel = state.colors_chosen?.length ? state.colors_chosen.join(", ") : undefined;

  const rows = [
    row("Feeling",    ROOM_FEELING_LABELS[state.room_feeling ?? ""]),
    row("Florals",    FLORAL_STYLE_LABELS[state.floral_style ?? ""]),
    row("Colors",     colorsLabel),
    row("Season",     SEASON_LABELS[state.season ?? ""]),
    row("Ceremony",   CEREMONY_LABELS[state.ceremony_location ?? ""]),
    row("Drink",      state.signature_drink),
    row("One thing",  PRIORITY_LABELS[state.priority ?? ""]),
    row("Guests",     guestLabel),
    row("Date",       state.wedding_date),
  ].filter(Boolean).join("");

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%">${rows}</table>`;
}

// ---------------------------------------------------------------------------
// Staff notification email
// ---------------------------------------------------------------------------

export function buildStaffNotificationEmail(state: BuilderState, content: VisionContent): string {
  const coupleNames = content.heading.replace(", this is your Haue Valley wedding.", "");
  const guestLabel   = state.guest_count ? GUEST_COUNT_LABELS[state.guest_count] : "Not specified";
  const colorsLabel  = state.colors_chosen?.length ? state.colors_chosen.join(", ") : "Not specified";
  const isAllIn      = state.all_inclusive_intent || state.priority === "all_inclusive";

  const allInBanner = isAllIn ? `
          <!-- All-inclusive alert -->
          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background-color:#4A5733;padding:12px 20px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#FFFFFF;">All-Inclusive Interest — mention this on the tour</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : "";

  function staffRow(label: string, value: string | undefined | boolean): string {
    if (value === undefined || value === "" || value === null) return "";
    const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
    return `<tr>
      <td style="padding:7px 16px 7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6B7355;white-space:nowrap;vertical-align:top;border-bottom:1px solid #E8E3D9;">${label}</td>
      <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2C2C2C;line-height:1.5;border-bottom:1px solid #E8E3D9;">${display}</td>
    </tr>`;
  }

  const visionHtml = content.vision
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2C;line-height:1.7;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Vision Builder Submission — ${coupleNames}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0EDE7;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F0EDE7;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#FFFFFF;">

          <!-- Header bar -->
          <tr>
            <td style="background-color:#4A5733;padding:20px 40px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:#FFFFFF;">Haue Valley — New Submission</p>
            </td>
          </tr>

          <!-- Couple + style name -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.3em;text-transform:uppercase;color:#6B7355;">${content.style_name}</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#2C2C2C;">${coupleNames}</h1>
            </td>
          </tr>

          <!-- Email link -->
          <tr>
            <td style="padding:4px 40px 28px;">
              <a href="mailto:${state.email}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4A5733;text-decoration:underline;">${state.email}</a>
            </td>
          </tr>

          ${allInBanner}

          <!-- Key details table -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${staffRow("Date",       state.wedding_date || "Not provided")}
                ${staffRow("Guests",     guestLabel)}
                ${staffRow("Budget",     state.budget_range || "Not provided")}
                ${staffRow("How found",  state.heard_about || "Not provided")}
                ${staffRow("Feeling",    ROOM_FEELING_LABELS[state.room_feeling ?? ""] || "Not specified")}
                ${staffRow("Florals",    FLORAL_STYLE_LABELS[state.floral_style ?? ""] || "Not specified")}
                ${staffRow("Colors",     colorsLabel)}
                ${staffRow("Season",     SEASON_LABELS[state.season ?? ""] || "Not specified")}
                ${staffRow("Ceremony",   CEREMONY_LABELS[state.ceremony_location ?? ""] || "Not specified")}
                ${staffRow("Drink",      state.signature_drink || "Not provided")}
                ${staffRow("One thing",  PRIORITY_LABELS[state.priority ?? ""] || "Not specified")}
                ${staffRow("All-incl.",  isAllIn ? "Yes — mention this" : undefined)}
              </table>
            </td>
          </tr>

          ${state.additional_notes ? `
          <!-- Notes -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#6B7355;">Their notes</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2C;line-height:1.7;font-style:italic;">${state.additional_notes}</p>
            </td>
          </tr>` : ""}

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="height:1px;background-color:#E8E3D9;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Vision copy -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#6B7355;">Their generated vision</p>
              ${visionHtml}
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7355;line-height:1.6;">${content.all_inclusive_paragraph}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;border-top:1px solid #E8E3D9;margin-top:8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#6B7355;opacity:0.6;">Haue Valley Vision Builder — Pacific, MO</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
