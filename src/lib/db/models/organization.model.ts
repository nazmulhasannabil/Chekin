import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  timezone: string;
  country: string;
  subscriptionTier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  subscriptionExpiresAt?: Date;
  isActive: boolean;
  settings: {
    biometricEnabled: boolean;
    geofenceEnabled: boolean;
    offlineCheckInEnabled: boolean;
    requireFaceForCheckIn: boolean;
    maxDevicesPerEmployee: number;
    attendanceWindowMinutes: number;
    confidenceThreshold: number;
    confidenceWeights: {
      face: number;
      liveness: number;
      device: number;
      geofence: number;
      network: number;
    };
    notificationChannels: string[];
    smtpConfigured: boolean;
    pushConfigured: boolean;
    dataRetentionDays: number;
    biometricRetentionDays: number;
  };
  hrContactName?: string;
  hrContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logoUrl: String,
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: String,
    address: String,
    timezone: { type: String, default: "Asia/Dhaka" },
    country: { type: String, default: "BD" },
    subscriptionTier: {
      type: String,
      enum: ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"],
      default: "FREE",
    },
    subscriptionExpiresAt: Date,
    isActive: { type: Boolean, default: true },
    settings: {
      biometricEnabled: { type: Boolean, default: false },
      geofenceEnabled: { type: Boolean, default: false },
      offlineCheckInEnabled: { type: Boolean, default: true },
      requireFaceForCheckIn: { type: Boolean, default: false },
      maxDevicesPerEmployee: { type: Number, default: 3 },
      attendanceWindowMinutes: { type: Number, default: 60 },
      confidenceThreshold: { type: Number, default: 0.6 },
      confidenceWeights: {
        face: { type: Number, default: 0.35 },
        liveness: { type: Number, default: 0.25 },
        device: { type: Number, default: 0.15 },
        geofence: { type: Number, default: 0.15 },
        network: { type: Number, default: 0.10 },
      },
      notificationChannels: { type: [String], default: ["PUSH", "EMAIL"] },
      smtpConfigured: { type: Boolean, default: false },
      pushConfigured: { type: Boolean, default: false },
      dataRetentionDays: { type: Number, default: 1825 }, // 5 years
      biometricRetentionDays: { type: Number, default: 365 },
    },
    hrContactName: String,
    hrContactPhone: String,
  },
  { timestamps: true }
);

OrganizationSchema.index({ slug: 1 }, { unique: true });

const Organization: Model<IOrganization> =
  mongoose.models.Organization ??
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
