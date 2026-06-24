"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/db/connection";
import {
  AttendanceDay,
  AttendanceEvent,
  AuditLog,
  CorrectionRequest,
} from "@/lib/db/models";
import { requirePermission } from "@/lib/auth/permissions";
import type { AttendanceStatus } from "@/types";

async function getIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ─── Manual Attendance Entry ──────────────────────────────────────────────────

export interface ManualAttendanceInput {
  employeeId: string;
  dateKey: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: AttendanceStatus;
  reason: string;
  hrComment?: string;
}

export async function addManualAttendance(input: ManualAttendanceInput) {
  const session = await requirePermission("attendance.override");
  await connectDB();

  const existing = await AttendanceDay.findOne({
    organizationId: session.organizationId,
    employeeId: input.employeeId,
    dateKey: input.dateKey,
  });

  const previousValue: Record<string, unknown> | undefined = existing
    ? { status: existing.status, checkInAt: existing.checkInAt, checkOutAt: existing.checkOutAt }
    : undefined;

  const updatedDay = await AttendanceDay.findOneAndUpdate(
    { organizationId: session.organizationId, employeeId: input.employeeId, dateKey: input.dateKey },
    {
      $set: {
        status: input.status,
        checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined,
        checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined,
        manuallyAdjusted: true,
        adjustedBy: session.userId,
        adjustmentReason: input.reason,
        hrComment: input.hrComment,
      },
      $setOnInsert: {
        organizationId: session.organizationId,
        employeeId: input.employeeId,
        dateKey: input.dateKey,
        date: new Date(input.dateKey),
        workedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        breakMinutes: 0,
      },
    },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "MANUAL_ATTENDANCE",
    resourceType: "AttendanceDay",
    resourceId: updatedDay._id,
    previousValue,
    newValue: { status: input.status, reason: input.reason },
    reason: input.reason,
    ipAddress: await getIp(),
  });

  return { success: true };
}

// ─── Lock / Unlock Month ──────────────────────────────────────────────────────

export async function lockMonth(year: number, month: number, branchId?: string) {
  const session = await requirePermission("attendance.override");
  await connectDB();

  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const endKey = `${year}-${String(month).padStart(2, "0")}-31`;

  const filter: Record<string, unknown> = {
    organizationId: session.organizationId,
    dateKey: { $gte: startKey, $lte: endKey },
  };
  if (branchId) filter.branchId = branchId;

  await AttendanceDay.updateMany(filter, {
    $set: {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: session.userId,
    },
  });

  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "MONTH_LOCKED",
    resourceType: "AttendanceMonth",
    newValue: { year, month, branchId },
    ipAddress: await getIp(),
  });

  return { success: true };
}

export async function unlockMonth(
  year: number,
  month: number,
  reason: string,
  branchId?: string
) {
  const session = await requirePermission("attendance.override");
  await connectDB();

  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const endKey = `${year}-${String(month).padStart(2, "0")}-31`;

  const filter: Record<string, unknown> = {
    organizationId: session.organizationId,
    dateKey: { $gte: startKey, $lte: endKey },
    isLocked: true,
  };
  if (branchId) filter.branchId = branchId;

  await AttendanceDay.updateMany(filter, {
    $set: { isLocked: false },
  });

  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "MONTH_UNLOCKED",
    resourceType: "AttendanceMonth",
    newValue: { year, month, reason, branchId },
    reason,
    ipAddress: await getIp(),
  });

  return { success: true };
}

// ─── Correction Approval ──────────────────────────────────────────────────────

export async function reviewCorrectionRequest(
  correctionId: string,
  decision: "APPROVED" | "REJECTED",
  comment: string
) {
  const session = await requirePermission("correction.approve");
  await connectDB();

  const correction = await CorrectionRequest.findOne({
    _id: correctionId,
    organizationId: session.organizationId,
    status: "PENDING",
  });

  if (!correction) return { success: false, error: "Correction request not found." };

  correction.status = decision;
  correction.reviewedBy = session.userId as unknown as typeof correction.reviewedBy;
  correction.reviewedAt = new Date();
  correction.reviewComment = comment;
  await correction.save();

  if (decision === "APPROVED") {
    // Apply the correction to the attendance day
    if (correction.attendanceDayId) {
      await AttendanceDay.updateOne(
        { _id: correction.attendanceDayId },
        {
          $set: {
            checkInAt: correction.requestedCheckIn,
            checkOutAt: correction.requestedCheckOut,
            manuallyAdjusted: true,
            adjustedBy: session.userId,
            adjustmentReason: `Correction approved: ${comment}`,
            correctionRequestId: correction._id,
          },
        }
      );
    }
  }

  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: `CORRECTION_${decision}`,
    resourceType: "CorrectionRequest",
    resourceId: correction._id,
    newValue: { decision, comment },
    ipAddress: await getIp(),
  });

  return { success: true };
}
