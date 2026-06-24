import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateDailySummaryReport } from "@/lib/reports/scheduled";
import connectDB from "@/lib/db/connection";
import { Organization } from "@/lib/db/models";

/**
 * Cron endpoint for scheduled reports.
 * Protect with CRON_SECRET to prevent unauthorized calls.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/reports", "schedule": "0 1 * * *" }]
 * }
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type = "DAILY" } = await request.json().catch(() => ({}));

  await connectDB();
  const orgs = await Organization.find({ isActive: true }).select("_id").lean();

  const results = await Promise.allSettled(
    orgs.map((org) => generateDailySummaryReport(org._id.toString()))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    ok: true,
    type,
    processed: orgs.length,
    succeeded,
    failed,
    timestamp: new Date().toISOString(),
  });
}

// Allow GET for manual testing with a secret query param
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const orgs = await Organization.find({ isActive: true }).select("_id").lean();
  const results = await Promise.allSettled(
    orgs.map((org) => generateDailySummaryReport(org._id.toString()))
  );

  return NextResponse.json({
    ok: true,
    processed: orgs.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
