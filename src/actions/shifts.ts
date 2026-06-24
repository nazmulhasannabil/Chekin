"use server";

import connectDB from "@/lib/db/connection";
import { Shift, Holiday, ShiftAssignment, AuditLog } from "@/lib/db/models";
import { requirePermission } from "@/lib/auth/permissions";
import { headers } from "next/headers";
import { toDateKey } from "@/lib/utils";

export interface ShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  checkInOpenMinutes?: number;
  gracePeriodMinutes?: number;
  lateThresholdMinutes?: number;
  halfDayThresholdMinutes?: number;
  minWorkingHours?: number;
  breakAllowanceMinutes?: number;
  overtimeAfterMinutes?: number;
  earlyLeaveThresholdMinutes?: number;
  isOvernight?: boolean;
  weeklyHolidays?: number[];
  remoteAllowed?: boolean;
  color?: string;
}

export async function createShift(input: ShiftInput) {
  const session = await requirePermission("shift.manage");
  await connectDB();

  const shift = await Shift.create({
    organizationId: session.organizationId,
    ...input,
  });

  const h = await headers();
  await AuditLog.create({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorName: session.name,
    action: "SHIFT_CREATED",
    resourceType: "Shift",
    resourceId: shift._id,
    newValue: input,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  });

  return { success: true, shiftId: shift._id.toString() };
}

export async function updateShift(shiftId: string, input: Partial<ShiftInput>) {
  const session = await requirePermission("shift.manage");
  await connectDB();

  const shift = await Shift.findOneAndUpdate(
    { _id: shiftId, organizationId: session.organizationId },
    { $set: input },
    { new: true }
  );

  if (!shift) return { success: false, error: "Shift not found." };
  return { success: true };
}

export async function createHoliday(input: {
  name: string;
  date: string;
  branchId?: string;
  description?: string;
  isRecurringYearly?: boolean;
}) {
  const session = await requirePermission("shift.manage");
  await connectDB();

  const date = new Date(input.date + "T00:00:00");
  await Holiday.create({
    organizationId: session.organizationId,
    name: input.name,
    date,
    dateKey: toDateKey(date),
    branchId: input.branchId || undefined,
    description: input.description,
    isRecurringYearly: input.isRecurringYearly ?? false,
    createdBy: session.userId,
  });

  return { success: true };
}

export async function assignShiftToEmployee(
  employeeId: string,
  shiftId: string,
  effectiveFrom: string
) {
  const session = await requirePermission("shift.manage");
  await connectDB();

  const { Employee } = await import("@/lib/db/models");
  const employee = await Employee.findOne({
    _id: employeeId,
    organizationId: session.organizationId,
  });

  if (!employee) return { success: false, error: "Employee not found." };

  // Close previous assignment
  await ShiftAssignment.updateMany(
    {
      organizationId: session.organizationId,
      employeeId,
      effectiveTo: null,
    },
    { $set: { effectiveTo: new Date(effectiveFrom) } }
  );

  await ShiftAssignment.create({
    organizationId: session.organizationId,
    employeeId,
    shiftId,
    effectiveFrom: new Date(effectiveFrom),
    assignedBy: session.userId,
  });

  await Employee.updateOne({ _id: employeeId }, { shiftId });

  return { success: true };
}
