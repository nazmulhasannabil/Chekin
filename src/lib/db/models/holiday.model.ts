import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IHoliday extends Document {
  organizationId: Types.ObjectId;
  branchId?: Types.ObjectId;
  name: string;
  date: Date;
  dateKey: string;
  isRecurringYearly: boolean;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    dateKey: { type: String, required: true },
    isRecurringYearly: { type: Boolean, default: false },
    description: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HolidaySchema.index({ organizationId: 1, dateKey: 1 });
HolidaySchema.index({ organizationId: 1, branchId: 1, dateKey: 1 });

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday ?? mongoose.model<IHoliday>("Holiday", HolidaySchema);

export default Holiday;
