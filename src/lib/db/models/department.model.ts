import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IDepartment extends Document {
  organizationId: Types.ObjectId;
  branchId?: Types.ObjectId;
  name: string;
  code: string;
  headId?: Types.ObjectId;
  parentDepartmentId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true },
    headId: { type: Schema.Types.ObjectId, ref: "Employee" },
    parentDepartmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ organizationId: 1, branchId: 1 });

const Department: Model<IDepartment> =
  mongoose.models.Department ??
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
