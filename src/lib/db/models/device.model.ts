import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IDevice extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  fingerprint: string;
  userAgent: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  trusted: boolean;
  trustedAt?: Date;
  trustedBy?: Types.ObjectId;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  lastSeenAt?: Date;
  lastSeenIp?: string;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    fingerprint: { type: String, required: true },
    userAgent: { type: String, required: true },
    platform: String,
    screenResolution: String,
    timezone: String,
    trusted: { type: Boolean, default: false },
    trustedAt: Date,
    trustedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastSeenAt: Date,
    lastSeenIp: String,
    label: String,
  },
  { timestamps: true }
);

DeviceSchema.index({ organizationId: 1, employeeId: 1, fingerprint: 1 }, { unique: true });
DeviceSchema.index({ fingerprint: 1 });

const Device: Model<IDevice> =
  mongoose.models.Device ?? mongoose.model<IDevice>("Device", DeviceSchema);

export default Device;
