"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/db/connection";
import { CorrectionRequest, AuditLog, Employee } from "@/lib/db/models";
import { requirePermission, requireAuth } from "@/lib/auth/permissions";

export async function submitCorrectionRequest(input: {
  attendanceDayId?: string;
  attendanceEventId?: string;
  reason: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  evidenceUrl?: string;
}) {
  const session = await requirePermission("correction.request");
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  }).lean();

  if (!employee) return { success: false, error: "Employee not found." };

  const correction = await CorrectionRequest.create({
    organizationId: session.organizationId,
    employeeId: employee._id,
    attendanceDayId: input.attendanceDayId || undefined,
    attendanceEventId: input.attendanceEventId || undefined,
    reason: input.reason,
    requestedCheckIn: input.requestedCheckIn ? new Date(input.requestedCheckIn) : undefined,
    requestedCheckOut: input.requestedCheckOut ? new Date(input.requestedCheckOut) : undefined,
    originalCheckIn: input.originalCheckIn ? new Date(input.originalCheckIn) : undefined,
    originalCheckOut: input.originalCheckOut ? new Date(input.originalCheckOut) : undefined,
    evidenceUrl: input.evidenceUrl,
    status: "PENDING",
  });

  const h = await headers();
  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "CORRECTION_REQUESTED",
    resourceType: "CorrectionRequest",
    resourceId: correction._id,
    newValue: { reason: input.reason },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  });

  return { success: true, correctionId: correction._id.toString() };
}
