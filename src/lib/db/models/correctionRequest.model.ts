import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { CorrectionStatus } from "@/types";

export interface ICorrectionRequest extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  attendanceDayId?: Types.ObjectId;
  attendanceEventId?: Types.ObjectId;
  reason: string;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  originalCheckIn?: Date;
  originalCheckOut?: Date;
  status: CorrectionStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewComment?: string;
  evidenceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CorrectionRequestSchema = new Schema<ICorrectionRequest>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    attendanceDayId: { type: Schema.Types.ObjectId, ref: "AttendanceDay" },
    attendanceEventId: { type: Schema.Types.ObjectId, ref: "AttendanceEvent" },
    reason: { type: String, required: true },
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    originalCheckIn: Date,
    originalCheckOut: Date,
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewComment: String,
    evidenceUrl: String,
  },
  { timestamps: true }
);

CorrectionRequestSchema.index({ organizationId: 1, status: 1 });
CorrectionRequestSchema.index({ organizationId: 1, employeeId: 1, status: 1 });

const CorrectionRequest: Model<ICorrectionRequest> =
  mongoose.models.CorrectionRequest ??
  mongoose.model<ICorrectionRequest>("CorrectionRequest", CorrectionRequestSchema);

export default CorrectionRequest;
