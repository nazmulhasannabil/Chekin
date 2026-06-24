import type { IShift } from "@/lib/db/models/shift.model";
import type { AttendanceStatus } from "@/types";

export interface RuleInput {
  checkInAt: Date;
  checkOutAt?: Date;
  shift: IShift;
  isHoliday: boolean;
  isLeave: boolean;
  timezone: string;
}

export interface RuleResult {
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  explanation: string;
}

function parseShiftTime(timeStr: string, date: Date, timezone: string): Date {
  // Parse "HH:MM" in the given timezone on the given date
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function minutesDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function evaluateAttendance(input: RuleInput): RuleResult {
  const { checkInAt, checkOutAt, shift, isHoliday, isLeave, timezone } = input;

  if (isHoliday) {
    return {
      status: "HOLIDAY",
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      explanation: "This day is a public holiday.",
    };
  }

  if (isLeave) {
    return {
      status: "ON_LEAVE",
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      explanation: "Employee is on approved leave.",
    };
  }

  const shiftStart = parseShiftTime(shift.startTime, checkInAt, timezone);
  const shiftEnd = parseShiftTime(shift.endTime, checkInAt, timezone);

  // Handle overnight shift
  if (shift.isOvernight && shiftEnd <= shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  const graceCutoff = new Date(shiftStart.getTime() + shift.gracePeriodMinutes * 60000);
  const lateCutoff = new Date(shiftStart.getTime() + shift.lateThresholdMinutes * 60000);
  const openWindow = new Date(shiftStart.getTime() - shift.checkInOpenMinutes * 60000);

  // Calculate lateness
  const lateMinutes = Math.max(0, minutesDiff(shiftStart, checkInAt));
  const isLate = checkInAt > graceCutoff;

  // Calculate worked time
  let workedMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;

  if (checkOutAt) {
    const rawWorked = minutesDiff(checkInAt, checkOutAt) - shift.breakAllowanceMinutes;
    workedMinutes = Math.max(0, rawWorked);

    const earlyLeave = minutesDiff(checkOutAt, shiftEnd);
    earlyLeaveMinutes = Math.max(0, earlyLeave);

    const overtime = minutesDiff(shiftEnd, checkOutAt);
    if (overtime > 0 && workedMinutes > shift.overtimeAfterMinutes) {
      overtimeMinutes = overtime;
    }
  }

  // Check day of week holiday
  const dayOfWeek = checkInAt.getDay();
  if (shift.weeklyHolidays.includes(dayOfWeek)) {
    return {
      status: "WEEKEND",
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes,
      overtimeMinutes,
      explanation: `This is a scheduled day off.`,
    };
  }

  // Out of window
  if (checkInAt < openWindow) {
    return {
      status: "PENDING_REVIEW",
      lateMinutes: 0,
      earlyLeaveMinutes,
      workedMinutes,
      overtimeMinutes,
      explanation: `Check-in at ${formatTime(checkInAt)} is outside the allowed window (opens at ${formatTime(openWindow)}).`,
    };
  }

  if (!checkOutAt) {
    if (workedMinutes === 0 && lateMinutes > shift.halfDayThresholdMinutes) {
      return {
        status: "MISSING_CHECKOUT",
        lateMinutes,
        earlyLeaveMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        explanation: `No checkout recorded. Shift started at ${shift.startTime}.`,
      };
    }
    return {
      status: "MISSING_CHECKOUT",
      lateMinutes,
      earlyLeaveMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      explanation: `Checked in at ${formatTime(checkInAt)} but no checkout recorded.`,
    };
  }

  // Half-day check
  if (workedMinutes < shift.halfDayThresholdMinutes) {
    return {
      status: "HALF_DAY",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      overtimeMinutes: 0,
      explanation: `Worked ${workedMinutes} minutes, which is below the half-day threshold of ${shift.halfDayThresholdMinutes} minutes.`,
    };
  }

  // Early leave
  if (earlyLeaveMinutes > shift.earlyLeaveThresholdMinutes && !overtimeMinutes) {
    return {
      status: "EARLY_LEAVE",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      overtimeMinutes: 0,
      explanation: `Left ${earlyLeaveMinutes} minutes early. Shift ends at ${shift.endTime}, checkout was at ${formatTime(checkOutAt)}.`,
    };
  }

  // Overtime
  if (overtimeMinutes > 0) {
    return {
      status: "OVERTIME",
      lateMinutes,
      earlyLeaveMinutes: 0,
      workedMinutes,
      overtimeMinutes,
      explanation: `Worked ${overtimeMinutes} minutes of overtime.`,
    };
  }

  // Late
  if (isLate) {
    return {
      status: "LATE",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      overtimeMinutes,
      explanation: `Marked late because your shift began at ${shift.startTime}, the grace period ended at ${formatTime(graceCutoff)}, and your verified check-in was recorded at ${formatTime(checkInAt)}.`,
    };
  }

  return {
    status: "PRESENT",
    lateMinutes: 0,
    earlyLeaveMinutes,
    workedMinutes,
    overtimeMinutes,
    explanation: `Present. Checked in at ${formatTime(checkInAt)}.`,
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
