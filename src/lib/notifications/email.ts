import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log("[Email] SMTP not configured. Would send to:", options.to, "Subject:", options.subject);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? '"Chekin" <noreply@chekin.app>',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export function buildNotificationEmail(
  type: string,
  recipientName: string,
  details: Record<string, string>
): { subject: string; html: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    SHIFT_REMINDER: {
      subject: "Your shift starts soon",
      body: `Hi ${recipientName}, your shift starts at ${details.startTime}. Please check in on time.`,
    },
    MISSED_CHECK_IN: {
      subject: "You haven't checked in yet",
      body: `Hi ${recipientName}, we noticed you haven't checked in for your shift that started at ${details.startTime}.`,
    },
    MISSING_CHECKOUT: {
      subject: "Missing checkout reminder",
      body: `Hi ${recipientName}, we noticed you haven't checked out. Please record your checkout as soon as possible.`,
    },
    CORRECTION_APPROVED: {
      subject: "Correction request approved",
      body: `Hi ${recipientName}, your correction request for ${details.date} has been approved. ${details.comment ? `HR comment: ${details.comment}` : ""}`,
    },
    CORRECTION_REJECTED: {
      subject: "Correction request rejected",
      body: `Hi ${recipientName}, your correction request for ${details.date} has been rejected. ${details.comment ? `Reason: ${details.comment}` : ""}`,
    },
    LEAVE_APPROVED: {
      subject: "Leave request approved",
      body: `Hi ${recipientName}, your leave request from ${details.startDate} to ${details.endDate} has been approved.`,
    },
    LEAVE_REJECTED: {
      subject: "Leave request rejected",
      body: `Hi ${recipientName}, your leave request from ${details.startDate} to ${details.endDate} has been rejected. ${details.comment ? `Reason: ${details.comment}` : ""}`,
    },
    MONTHLY_SUMMARY: {
      subject: `Your attendance summary for ${details.month}`,
      body: `Hi ${recipientName}, your attendance summary for ${details.month}: Present: ${details.presentDays} days, Late: ${details.lateDays} days, Attendance: ${details.attendancePct}%.`,
    },
  };

  const template = templates[type] ?? {
    subject: "Chekin notification",
    body: `Hi ${recipientName}, you have a new notification from Chekin.`,
  };

  return {
    subject: template.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; background: #f9fafb; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
            <div style="width: 32px; height: 32px; background: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 14px;">C</span>
            </div>
            <span style="font-weight: bold; font-size: 16px; color: #111827;">Chekin</span>
          </div>
          <p style="color: #374151; line-height: 1.6;">${template.body}</p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            You received this email because you are registered with Chekin Attendance Management.
          </p>
        </div>
      </body>
      </html>
    `,
  };
}
