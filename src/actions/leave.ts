"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/db/connection";
import { LeaveRequest, AttendanceDay, Employee, AuditLog } from "@/lib/db/models";
import { requirePermission, requireAuth } from "@/lib/auth/permissions";
import { toDateKey } from "@/lib/utils";

const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "UNPAID",
  "MATERNITY",
  "PATERNITY",
  "BEREAVEMENT",
  "EMERGENCY",
  "STUDY",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export async function submitLeaveRequest(input: {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
}) {
  const session = await requirePermission("leave.request");
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  }).lean();

  if (!employee) return { success: false, error: "Employee record not found." };

  const startDate = new Date(input.startDate + "T00:00:00");
  const endDate = new Date(input.endDate + "T00:00:00");

  if (endDate < startDate) {
    return { success: false, error: "End date must be after start date." };
  }

  const totalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await LeaveRequest.create({
    organizationId: session.organizationId,
    employeeId: employee._id,
    leaveType: input.leaveType,
    startDate,
    endDate,
    totalDays,
    reason: input.reason,
    status: "PENDING",
    attachmentUrl: input.attachmentUrl,
  });

  const h = await headers();
  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "LEAVE_REQUESTED",
    resourceType: "LeaveRequest",
    resourceId: leave._id,
    newValue: { leaveType: input.leaveType, startDate: input.startDate, endDate: input.endDate },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  });

  return { success: true, leaveId: leave._id.toString() };
}

export async function reviewLeaveRequest(
  leaveId: string,
  decision: "APPROVED" | "REJECTED",
  comment: string
) {
  const session = await requirePermission("leave.approve");
  await connectDB();

  const leave = await LeaveRequest.findOne({
    _id: leaveId,
    organizationId: session.organizationId,
    status: "PENDING",
  });

  if (!leave) return { success: false, error: "Leave request not found." };

  leave.status = decision;
  leave.reviewedBy = session.userId as unknown as typeof leave.reviewedBy;
  leave.reviewedAt = new Date();
  leave.reviewComment = comment;
  await leave.save();

  if (decision === "APPROVED") {
    // Mark all working days in the range as ON_LEAVE
    const current = new Date(leave.startDate);
    while (current <= leave.endDate) {
      const dateKey = toDateKey(current);
      await AttendanceDay.findOneAndUpdate(
        { organizationId: leave.organizationId.toString(), employeeId: leave.employeeId, dateKey },
        {
          $set: {
            status: "ON_LEAVE",
            statusExplanation: `Approved ${leave.leaveType.toLowerCase()} leave.`,
          },
          $setOnInsert: {
            date: new Date(current),
            workedMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 0,
            breakMinutes: 0,
            manuallyAdjusted: false,
          },
        },
        { upsert: true }
      );
      current.setDate(current.getDate() + 1);
    }
  }

  const h = await headers();
  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: `LEAVE_${decision}`,
    resourceType: "LeaveRequest",
    resourceId: leave._id,
    newValue: { decision, comment },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  });

  return { success: true };
}
