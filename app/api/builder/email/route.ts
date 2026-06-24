import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { buildVisionEmail } from "@/lib/email-template";

interface EmailPayload {
  state: BuilderState;
  content: {
    heading: string;
    style_name: string;
    vision: string;
    all_inclusive_paragraph: string;
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "Email not configured" });
  }

  try {
    const { state, content }: EmailPayload = await req.json();

    if (!state.email) {
      return NextResponse.json({ ok: false, error: "No email address" });
    }

    const coupleNames = content.heading.replace(", this is your Haue Valley wedding.", "");
    const html = buildVisionEmail(state, content);

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "Haue Valley Weddings <hello@hauevalleyweddings.com>",
      to: [state.email],
      bcc: ["hauevalley@gmail.com"],
      subject: `${coupleNames} — Your Haue Valley Vision`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email route error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
