import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IWebhook extends Document {
  organizationId: Types.ObjectId;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    secret: { type: String, required: true },
    events: {
      type: [String],
      default: ["attendance.created"],
      enum: ["attendance.created", "correction.approved", "leave.approved", "leave.rejected"],
    },
    isActive: { type: Boolean, default: true },
    lastTriggeredAt: Date,
    failureCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

WebhookSchema.index({ organizationId: 1, isActive: 1 });

const Webhook: Model<IWebhook> =
  mongoose.models.Webhook ?? mongoose.model<IWebhook>("Webhook", WebhookSchema);

export default Webhook;
