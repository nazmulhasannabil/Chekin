import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IBranch extends Document {
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  timezone: string;
  isActive: boolean;
  geofence?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  workingDays: number[];
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true },
    address: String,
    timezone: { type: String, default: "Asia/Dhaka" },
    isActive: { type: Boolean, default: true },
    geofence: {
      latitude: Number,
      longitude: Number,
      radiusMeters: { type: Number, default: 100 },
    },
    workingDays: { type: [Number], default: [0, 1, 2, 3, 4] },
  },
  { timestamps: true }
);

BranchSchema.index({ organizationId: 1, code: 1 }, { unique: true });

const Branch: Model<IBranch> =
  mongoose.models.Branch ?? mongoose.model<IBranch>("Branch", BranchSchema);

export default Branch;
