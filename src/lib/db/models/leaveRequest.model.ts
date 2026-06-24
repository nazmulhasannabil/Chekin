import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { LeaveStatus } from "@/types";

export interface ILeaveRequest extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewComment?: string;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewComment: String,
    attachmentUrl: String,
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ organizationId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ organizationId: 1, startDate: 1, endDate: 1 });

const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ??
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
