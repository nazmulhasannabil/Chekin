import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { EmployeeStatus } from "@/types";

export interface IEmployee extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  nationalId?: string;
  dateOfBirth?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
  profileImageUrl?: string;
  designation?: string;
  department?: Types.ObjectId;
  branch?: Types.ObjectId;
  managerId?: Types.ObjectId;
  shiftId?: Types.ObjectId;
  employmentStartDate: Date;
  employmentEndDate?: Date;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: EmployeeStatus;
  biometricEnrolled: boolean;
  faceProfileId?: Types.ObjectId;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes?: string;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeCode: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true },
    phone: String,
    nationalId: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"] },
    profileImageUrl: String,
    designation: String,
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },
    employmentStartDate: { type: Date, required: true },
    employmentEndDate: Date,
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
      default: "FULL_TIME",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
    biometricEnrolled: { type: Boolean, default: false },
    faceProfileId: { type: Schema.Types.ObjectId, ref: "FaceProfile" },
    address: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    notes: String,
    archivedAt: Date,
    archivedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

EmployeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, status: 1 });
EmployeeSchema.index({ organizationId: 1, branch: 1, status: 1 });
EmployeeSchema.index({ organizationId: 1, department: 1, status: 1 });
EmployeeSchema.index({ organizationId: 1, managerId: 1 });
EmployeeSchema.index({ userId: 1 }, { unique: true });

const Employee: Model<IEmployee> =
  mongoose.models.Employee ?? mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
