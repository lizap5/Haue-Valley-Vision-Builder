import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { buildVisionEmail, buildStaffNotificationEmail } from "@/lib/email-template";

interface EmailPayload {
  state: BuilderState;
  content: {
    heading: string;
    style_name: string;
    vision: string;
    all_inclusive_paragraph: string;
  };
}

const STAFF_EMAIL = "hauevalley@gmail.com";

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "Email not configured" });
  }

  try {
    const { state, content }: EmailPayload = await req.json();

    if (!state.email) {
      return NextResponse.json({ ok: false, error: "No email address" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const coupleNames = content.heading.replace(", this is your Haue Valley wedding.", "");
    const isAllIn = state.all_inclusive_intent || state.priority === "all_inclusive";

    // Send both emails concurrently
    const [coupleResult, staffResult] = await Promise.allSettled([
      // Couple email — their personalized vision
      resend.emails.send({
        from: "Haue Valley Weddings <hello@hauevalleyweddings.com>",
        to: [state.email],
        subject: `${coupleNames} — Your Haue Valley Vision`,
        html: buildVisionEmail(state, content),
      }),

      // Staff notification — full submission details for Kristin
      resend.emails.send({
        from: "Haue Valley Vision Builder <hello@hauevalleyweddings.com>",
        to: [STAFF_EMAIL],
        subject: `${isAllIn ? "⭐ " : ""}New submission — ${coupleNames}${state.wedding_date ? ` · ${state.wedding_date}` : ""}`,
        html: buildStaffNotificationEmail(state, content),
      }),
    ]);

    const coupleError = coupleResult.status === "rejected" ? coupleResult.reason : coupleResult.value.error;
    const staffError  = staffResult.status === "rejected"  ? staffResult.reason  : staffResult.value.error;

    if (coupleError) console.error("Couple email error:", coupleError);
    if (staffError)  console.error("Staff email error:",  staffError);

    return NextResponse.json({
      ok: !coupleError,
      coupleEmailSent: !coupleError,
      staffEmailSent:  !staffError,
    });
  } catch (err) {
    console.error("Email route error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
