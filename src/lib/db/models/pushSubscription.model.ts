import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IPushSubscription extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1, isActive: 1 });
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

export default PushSubscription;
