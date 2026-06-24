import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { Role } from "@/types";

export interface IPasskey {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IMfaConfig {
  enabled: boolean;
  totpSecret?: string;
  recoveryCodes: string[];
  enrolledAt?: Date;
}

export interface IUser extends Document {
  organizationId: Types.ObjectId;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string;
  hashedPassword?: string;
  role: Role;
  employeeId?: Types.ObjectId;
  passkeys: IPasskey[];
  mfa: IMfaConfig;
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  emailVerificationToken?: string;
  sessions?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PasskeySchema = new Schema<IPasskey>({
  credentialId: { type: String, required: true },
  publicKey: { type: String, required: true },
  counter: { type: Number, required: true, default: 0 },
  deviceType: { type: String, default: "unknown" },
  backedUp: { type: Boolean, default: false },
  transports: [String],
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: Date,
});

const UserSchema = new Schema<IUser>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    name: { type: String, required: true },
    image: String,
    hashedPassword: String,
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "HR_ADMIN", "BRANCH_ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
      default: "EMPLOYEE",
    },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    passkeys: [PasskeySchema],
    mfa: {
      enabled: { type: Boolean, default: false },
      totpSecret: String,
      recoveryCodes: { type: [String], default: [] },
      enrolledAt: Date,
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    lastLoginIp: String,
    passwordResetToken: String,
    passwordResetExpiresAt: Date,
    emailVerificationToken: String,
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, role: 1 });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
