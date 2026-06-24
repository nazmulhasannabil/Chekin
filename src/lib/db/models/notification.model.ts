import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { NotificationChannel } from "@/types";

export type NotificationType =
  | "SHIFT_REMINDER"
  | "MISSED_CHECK_IN"
  | "MISSING_CHECKOUT"
  | "CORRECTION_APPROVED"
  | "CORRECTION_REJECTED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "SHIFT_CHANGED"
  | "MONTHLY_SUMMARY"
  | "FACE_ENROLLMENT_EXPIRY"
  | "FACE_RE_ENROLLMENT"
  | "ANOMALY_FLAGGED";

export interface INotification extends Document {
  organizationId: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  recipientEmployeeId?: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    type: { type: String, required: true },
    channel: { type: String, enum: ["PUSH", "EMAIL", "IN_APP"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    sentAt: Date,
    failedAt: Date,
    failureReason: String,
    expiresAt: Date,
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
