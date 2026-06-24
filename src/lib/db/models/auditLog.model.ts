import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IAuditLog extends Document {
  organizationId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId?: Types.ObjectId | string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.Mixed },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: String,
    ipAddress: String,
    userAgent: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
