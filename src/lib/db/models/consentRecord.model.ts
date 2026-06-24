import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IConsentRecord extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  userId: Types.ObjectId;
  policyVersion: string;
  acceptedAt: Date;
  biometricConsentAt?: Date;
  biometricConsentPolicyVersion?: string;
  consentText?: string;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentRecordSchema = new Schema<IConsentRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    policyVersion: { type: String, required: true },
    acceptedAt: { type: Date, required: true },
    biometricConsentAt: Date,
    biometricConsentPolicyVersion: String,
    consentText: String,
    ipAddress: String,
    userAgent: String,
    revokedAt: Date,
    revokedReason: String,
  },
  { timestamps: true }
);

ConsentRecordSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });

const ConsentRecord: Model<IConsentRecord> =
  mongoose.models.ConsentRecord ??
  mongoose.model<IConsentRecord>("ConsentRecord", ConsentRecordSchema);

export default ConsentRecord;
