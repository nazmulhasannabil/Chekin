import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession, can } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceEvent, AuditLog } from "@/lib/db/models";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !can(session.role, "anomaly.review")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId, status, reason } = await request.json();
  if (!eventId || !["ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectDB();

  const event = await AttendanceEvent.findOneAndUpdate(
    { _id: eventId, organizationId: session.organizationId },
    {
      $set: {
        status,
        overriddenBy: session.userId,
        overrideReason: reason,
        overriddenAt: new Date(),
      },
    },
    { new: true }
  );

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: `ANOMALY_${status}`,
    resourceType: "AttendanceEvent",
    resourceId: event._id,
    newValue: { status, reason },
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
  });

  return NextResponse.json({ success: true });
}
