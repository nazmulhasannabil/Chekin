import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IShiftAssignment extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  shiftId: Types.ObjectId;
  effectiveFrom: Date;
  effectiveTo?: Date;
  assignedBy: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift", required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: Date,
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: String,
  },
  { timestamps: true }
);

ShiftAssignmentSchema.index({ organizationId: 1, employeeId: 1, effectiveFrom: -1 });

const ShiftAssignment: Model<IShiftAssignment> =
  mongoose.models.ShiftAssignment ??
  mongoose.model<IShiftAssignment>("ShiftAssignment", ShiftAssignmentSchema);

export default ShiftAssignment;
