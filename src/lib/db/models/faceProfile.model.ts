import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IFaceProfile extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  encryptedDescriptor: string;   // AES-256-encrypted JSON of Float32Array
  encryptionKeyId: string;
  descriptorVersion: number;
  enrolledAt: Date;
  enrolledBy?: Types.ObjectId;
  consentRecordId: Types.ObjectId;
  expiresAt?: Date;
  isActive: boolean;
  qualityScore?: number;
  lastVerifiedAt?: Date;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FaceProfileSchema = new Schema<IFaceProfile>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
    encryptedDescriptor: { type: String, required: true },
    encryptionKeyId: { type: String, required: true },
    descriptorVersion: { type: Number, default: 1 },
    enrolledAt: { type: Date, required: true },
    enrolledBy: { type: Schema.Types.ObjectId, ref: "User" },
    consentRecordId: { type: Schema.Types.ObjectId, ref: "ConsentRecord", required: true },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    qualityScore: Number,
    lastVerifiedAt: Date,
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FaceProfileSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });
FaceProfileSchema.index({ expiresAt: 1 }, { sparse: true });

const FaceProfile: Model<IFaceProfile> =
  mongoose.models.FaceProfile ??
  mongoose.model<IFaceProfile>("FaceProfile", FaceProfileSchema);

export default FaceProfile;
