import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IApiKey extends Document {
  organizationId: Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  createdBy: Types.ObjectId;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    permissions: { type: [String], default: ["attendance.read"] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastUsedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ApiKeySchema.index({ keyHash: 1 }, { unique: true });
ApiKeySchema.index({ organizationId: 1, isActive: 1 });

const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey ?? mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKey;
