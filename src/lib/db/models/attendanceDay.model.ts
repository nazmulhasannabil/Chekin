import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { AttendanceStatus } from "@/types";

export interface IAttendanceDay extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  branchId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  shiftId?: Types.ObjectId;
  dateKey: string;           // "2026-06-15"
  date: Date;
  status: AttendanceStatus;
  checkInAt?: Date;
  checkOutAt?: Date;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: Types.ObjectId;
  statusExplanation?: string;
  firstEventId?: Types.ObjectId;
  lastEventId?: Types.ObjectId;
  correctionRequestId?: Types.ObjectId;
  manuallyAdjusted: boolean;
  adjustedBy?: Types.ObjectId;
  adjustmentReason?: string;
  hrComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceDaySchema = new Schema<IAttendanceDay>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },
    dateKey: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "PRESENT", "LATE", "ABSENT", "ON_LEAVE", "REMOTE", "FIELD_VISIT",
        "WEEKEND", "HOLIDAY", "HALF_DAY", "EARLY_LEAVE", "OVERTIME",
        "MISSING_CHECKOUT", "PENDING_REVIEW", "REJECTED",
      ],
      default: "ABSENT",
    },
    checkInAt: Date,
    checkOutAt: Date,
    workedMinutes: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    lockedAt: Date,
    lockedBy: { type: Schema.Types.ObjectId, ref: "User" },
    statusExplanation: String,
    firstEventId: { type: Schema.Types.ObjectId, ref: "AttendanceEvent" },
    lastEventId: { type: Schema.Types.ObjectId, ref: "AttendanceEvent" },
    correctionRequestId: { type: Schema.Types.ObjectId, ref: "CorrectionRequest" },
    manuallyAdjusted: { type: Boolean, default: false },
    adjustedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adjustmentReason: String,
    hrComment: String,
  },
  { timestamps: true }
);

// Unique daily summary per employee
AttendanceDaySchema.index(
  { organizationId: 1, employeeId: 1, dateKey: 1 },
  { unique: true }
);
AttendanceDaySchema.index({ organizationId: 1, dateKey: 1, status: 1 });
AttendanceDaySchema.index({ organizationId: 1, branchId: 1, dateKey: 1 });
AttendanceDaySchema.index({ organizationId: 1, departmentId: 1, dateKey: 1 });

const AttendanceDay: Model<IAttendanceDay> =
  mongoose.models.AttendanceDay ??
  mongoose.model<IAttendanceDay>("AttendanceDay", AttendanceDaySchema);

export default AttendanceDay;
