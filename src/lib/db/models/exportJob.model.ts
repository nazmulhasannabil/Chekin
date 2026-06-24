import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { ExportJobStatus } from "@/types";

export interface IExportJob extends Document {
  organizationId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  type: "ATTENDANCE" | "EMPLOYEE_SUMMARY" | "DEPARTMENT_SUMMARY" | "PAYROLL";
  format: "XLSX" | "CSV" | "PDF";
  filters: Record<string, unknown>;
  status: ExportJobStatus;
  s3Key?: string;
  signedUrl?: string;
  signedUrlExpiresAt?: Date;
  recordCount?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExportJobSchema = new Schema<IExportJob>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["ATTENDANCE", "EMPLOYEE_SUMMARY", "DEPARTMENT_SUMMARY", "PAYROLL"],
      required: true,
    },
    format: { type: String, enum: ["XLSX", "CSV", "PDF"], required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    s3Key: String,
    signedUrl: String,
    signedUrlExpiresAt: Date,
    recordCount: Number,
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

ExportJobSchema.index({ organizationId: 1, requestedBy: 1, createdAt: -1 });
ExportJobSchema.index({ status: 1, createdAt: 1 });
ExportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ExportJob: Model<IExportJob> =
  mongoose.models.ExportJob ??
  mongoose.model<IExportJob>("ExportJob", ExportJobSchema);

export default ExportJob;
