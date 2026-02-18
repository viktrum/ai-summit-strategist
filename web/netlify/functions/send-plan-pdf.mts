import type { Context } from "@netlify/functions";
import { Resend } from "resend";
import { jsPDF } from "jspdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanEvent {
  title: string;
  start_time: string;
  end_time: string | null;
  venue: string;
  room: string;
  speakers: string;
  summary_one_liner: string;
  tier: string;
  score: number;
  is_time_slot_fill?: boolean;
}

interface PlanDay {
  date: string;
  events: PlanEvent[];
}

interface RequestBody {
  email: string;
  company?: string;
  plan: {
    headline: string;
    strategy_note: string;
    schedule: PlanDay[];
    exhibitor_count: number;
  };
  plan_url: string;
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

const COLORS = {
  indigo: [67, 56, 202] as [number, number, number],
  darkText: [41, 37, 36] as [number, number, number],
  bodyText: [87, 83, 78] as [number, number, number],
  mutedText: [168, 162, 158] as [number, number, number],
  accent: [99, 102, 241] as [number, number, number],
  divider: [224, 220, 214] as [number, number, number],
  bgLight: [250, 249, 247] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  mustAttend: [67, 56, 202] as [number, number, number],
  shouldAttend: [5, 150, 105] as [number, number, number],
  niceToHave: [202, 138, 4] as [number, number, number],
  wildcard: [168, 85, 247] as [number, number, number],
  timeFill: [3, 105, 161] as [number, number, number],
};

const TIER_COLORS: Record<string, [number, number, number]> = {
  "Must Attend": COLORS.mustAttend,
  "Should Attend": COLORS.shouldAttend,
  "Nice to Have": COLORS.niceToHave,
  "Wildcard": COLORS.wildcard,
};

const PAGE_WIDTH = 210; // A4
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function generatePDF(plan: RequestBody["plan"], planUrl: string): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_TOP;

  function checkPageBreak(needed: number) {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
      // Light footer line on new page
      doc.setDrawColor(...COLORS.divider);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 15);
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("AI Impact Summit 2026 — aisummit26.info", PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: "center" });
    }
  }

  // ── HEADER ──────────────────────────────────────────────────────
  // Accent bar
  doc.setFillColor(...COLORS.indigo);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  y = 15;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.indigo);
  doc.setFont("helvetica", "bold");
  doc.text("AI IMPACT SUMMIT 2026", MARGIN_LEFT, y);
  doc.setTextColor(...COLORS.mutedText);
  doc.setFont("helvetica", "normal");
  doc.text("Your Personalised Schedule", PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });

  y += 8;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);

  // ── PLAN HEADLINE ───────────────────────────────────────────────
  y += 10;
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "bold");
  const headlineLines = doc.splitTextToSize(plan.headline, CONTENT_WIDTH);
  doc.text(headlineLines, MARGIN_LEFT, y);
  y += headlineLines.length * 8;

  // Strategy note
  y += 2;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.bodyText);
  doc.setFont("helvetica", "normal");
  const noteLines = doc.splitTextToSize(plan.strategy_note, CONTENT_WIDTH);
  doc.text(noteLines, MARGIN_LEFT, y);
  y += noteLines.length * 5 + 3;

  // Stats line
  const totalEvents = plan.schedule.reduce((acc, d) => acc + d.events.length, 0);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(
    `${totalEvents} events · ${plan.schedule.length} day${plan.schedule.length !== 1 ? "s" : ""}${plan.exhibitor_count > 0 ? ` · ${plan.exhibitor_count} exhibitions` : ""}`,
    MARGIN_LEFT,
    y,
  );
  y += 10;

  // ── SCHEDULE ────────────────────────────────────────────────────
  for (const day of plan.schedule) {
    checkPageBreak(25);

    // Day header bar
    doc.setFillColor(...COLORS.indigo);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 9, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text(formatDateLong(day.date), MARGIN_LEFT + 5, y + 6.5);
    doc.text(`${day.events.length} events`, PAGE_WIDTH - MARGIN_RIGHT - 5, y + 6.5, { align: "right" });
    y += 14;

    for (const event of day.events) {
      // Estimate height needed for this event card
      const titleLines = doc.splitTextToSize(event.title, CONTENT_WIDTH - 50);
      const oneLinerLines = doc.splitTextToSize(event.summary_one_liner, CONTENT_WIDTH - 10);
      const speakerText = event.speakers ? `Speakers: ${event.speakers}` : "";
      const speakerLines = speakerText ? doc.splitTextToSize(speakerText, CONTENT_WIDTH - 10) : [];
      const cardHeight = 8 + titleLines.length * 5 + oneLinerLines.length * 4 + (speakerLines.length > 0 ? speakerLines.length * 3.5 + 2 : 0) + 10;

      checkPageBreak(cardHeight + 4);

      // Card background
      doc.setFillColor(...COLORS.bgLight);
      doc.setDrawColor(...COLORS.divider);
      doc.setLineWidth(0.2);
      doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, cardHeight, 2, 2, "FD");

      const cardX = MARGIN_LEFT + 5;
      let cardY = y + 5;

      // Time
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.indigo);
      doc.setFont("helvetica", "bold");
      const timeStr = `${formatTime(event.start_time)}${event.end_time ? " – " + formatTime(event.end_time) : ""}`;
      doc.text(timeStr, cardX, cardY);

      // Tier badge
      const tierColor = TIER_COLORS[event.tier] || COLORS.mutedText;
      const tierText = event.is_time_slot_fill ? "Best at This Time" : event.tier;
      const badgeColor = event.is_time_slot_fill ? COLORS.timeFill : tierColor;
      doc.setFontSize(6.5);
      doc.setTextColor(...badgeColor);
      const tierWidth = doc.getTextWidth(tierText) + 4;
      const tierX = PAGE_WIDTH - MARGIN_RIGHT - 5 - tierWidth;
      doc.setDrawColor(...badgeColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(tierX, cardY - 3, tierWidth + 2, 5, 1, 1, "D");
      doc.text(tierText, tierX + 2, cardY);

      // Score
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.mutedText);
      doc.text(`${event.score}%`, tierX - 8, cardY);

      cardY += 5;

      // Title
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, cardX, cardY);
      cardY += titleLines.length * 5;

      // Venue + room
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.mutedText);
      doc.setFont("helvetica", "normal");
      const venueText = [event.venue, event.room].filter(Boolean).join(" · ");
      if (venueText) {
        doc.text(venueText, cardX, cardY);
        cardY += 3.5;
      }

      // One-liner
      cardY += 1;
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.bodyText);
      doc.setFont("helvetica", "italic");
      doc.text(oneLinerLines, cardX, cardY);
      cardY += oneLinerLines.length * 4;

      // Speakers
      if (speakerLines.length > 0) {
        cardY += 1;
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.mutedText);
        doc.setFont("helvetica", "normal");
        doc.text(speakerLines, cardX, cardY);
      }

      y += cardHeight + 3;
    }

    y += 5;
  }

  // ── FOOTER ──────────────────────────────────────────────────────
  checkPageBreak(20);
  y += 5;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.indigo);
  doc.setFont("helvetica", "bold");
  doc.text("View your interactive schedule:", MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.accent);
  doc.text(planUrl, MARGIN_LEFT + 45, y);

  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Built by Piyush Mayank — linkedin.com/in/piyushmayank?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app", MARGIN_LEFT, y);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.divider);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mutedText);
    doc.setFont("helvetica", "normal");
    doc.text(
      "AI Impact Summit 2026 — aisummit26.info",
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: "center" },
    );
    doc.text(`${i}/${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async (req: Request, _context: Context) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { email, plan, plan_url } = body;

    if (!email || !plan || !plan.schedule) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Generate PDF
    const pdfBuffer = generatePDF(plan, plan_url);

    // Send email via Resend
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "AI Summit Planner <onboarding@resend.dev>";
    const replyToAddress = process.env.RESEND_REPLY_TO || undefined;

    await resend.emails.send({
      from: fromAddress,
      replyTo: replyToAddress,
      to: email,
      subject: `Your AI Summit Schedule — ${plan.headline}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #4338CA, #6366F1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 20px; margin: 0 0 8px 0;">Your Summit Schedule is Ready</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">${plan.headline}</p>
          </div>

          <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
            Your personalised PDF schedule is attached. Print it or save it on your phone for offline access at the venue.
          </p>

          <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
            <strong>${plan.schedule.reduce((a, d) => a + d.events.length, 0)} curated events</strong> across
            <strong>${plan.schedule.length} day${plan.schedule.length !== 1 ? "s" : ""}</strong>, with networking intel and icebreakers.
          </p>

          <a href="${plan_url}" style="display: inline-block; background: #4338CA; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0;">
            View Interactive Schedule →
          </a>

          <hr style="border: none; border-top: 1px solid #E0DCD6; margin: 24px 0;" />

          <p style="color: #A8A29E; font-size: 12px;">
            Built by <a href="https://www.linkedin.com/in/piyushmayank?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" style="color: #4338CA;">Piyush Mayank</a> — see you at the summit!
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "AI-Summit-Schedule.pdf",
          content: pdfBuffer,
        },
      ],
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-plan-pdf error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = {
  path: "/api/send-plan-pdf",
};
