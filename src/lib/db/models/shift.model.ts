import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IShift extends Document {
  organizationId: Types.ObjectId;
  name: string;
  startTime: string;
  endTime: string;
  checkInOpenMinutes: number;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  minWorkingHours: number;
  breakAllowanceMinutes: number;
  overtimeAfterMinutes: number;
  earlyLeaveThresholdMinutes: number;
  isOvernight: boolean;
  weeklyHolidays: number[];
  locationRestricted: boolean;
  allowedBranchIds: Types.ObjectId[];
  remoteAllowed: boolean;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    checkInOpenMinutes: { type: Number, default: 60 },
    gracePeriodMinutes: { type: Number, default: 10 },
    lateThresholdMinutes: { type: Number, default: 15 },
    halfDayThresholdMinutes: { type: Number, default: 240 },
    minWorkingHours: { type: Number, default: 8 },
    breakAllowanceMinutes: { type: Number, default: 60 },
    overtimeAfterMinutes: { type: Number, default: 480 },
    earlyLeaveThresholdMinutes: { type: Number, default: 30 },
    isOvernight: { type: Boolean, default: false },
    weeklyHolidays: { type: [Number], default: [5, 6] },
    locationRestricted: { type: Boolean, default: false },
    allowedBranchIds: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    remoteAllowed: { type: Boolean, default: false },
    color: { type: String, default: "#6366f1" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ShiftSchema.index({ organizationId: 1, name: 1 });

const Shift: Model<IShift> =
  mongoose.models.Shift ?? mongoose.model<IShift>("Shift", ShiftSchema);

export default Shift;
