import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type {
  AttendanceEventType,
  AttendanceSource,
  EventStatus,
  WorkMode,
} from "@/types";

export interface IAttendanceEventDoc extends Document {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  type: AttendanceEventType;
  recordedAt: Date;
  source: AttendanceSource;
  workMode?: WorkMode;
  workLocationNote?: string;
  shiftId?: Types.ObjectId;
  deviceId?: Types.ObjectId;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    geofenceId?: Types.ObjectId;
    insideAllowedArea: boolean;
  };
  verification?: {
    faceMatched: boolean;
    faceScore?: number;
    livenessPassed?: boolean;
    deviceTrusted: boolean;
    confidenceScore: number;
    breakdown?: {
      face: number;
      liveness: number;
      device: number;
      geofence: number;
      network: number;
    };
  };
  status: EventStatus;
  rejectionReasons: string[];
  statusExplanation?: string;
  ipAddress?: string;
  anomalyFlags: string[];
  idempotencyKey: string;
  overriddenBy?: Types.ObjectId;
  overrideReason?: string;
  overriddenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceEventSchema = new Schema<IAttendanceEventDoc>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    type: {
      type: String,
      enum: ["CHECK_IN", "CHECK_OUT", "BREAK_START", "BREAK_END"],
      required: true,
    },
    recordedAt: { type: Date, required: true },
    source: {
      type: String,
      enum: ["FACE", "PASSKEY", "MANUAL", "OFFLINE_SYNC"],
      required: true,
    },
    workMode: {
      type: String,
      enum: ["OFFICE", "REMOTE", "FIELD_VISIT", "CLIENT_SITE"],
    },
    workLocationNote: String,
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device" },
    location: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
      geofenceId: { type: Schema.Types.ObjectId, ref: "Branch" },
      insideAllowedArea: { type: Boolean, default: false },
    },
    verification: {
      faceMatched: Boolean,
      faceScore: Number,
      livenessPassed: Boolean,
      deviceTrusted: { type: Boolean, default: false },
      confidenceScore: { type: Number, default: 0 },
      breakdown: {
        face: Number,
        liveness: Number,
        device: Number,
        geofence: Number,
        network: Number,
      },
    },
    status: {
      type: String,
      enum: ["ACCEPTED", "PENDING_REVIEW", "REJECTED"],
      default: "ACCEPTED",
    },
    rejectionReasons: { type: [String], default: [] },
    statusExplanation: String,
    ipAddress: String,
    anomalyFlags: { type: [String], default: [] },
    idempotencyKey: { type: String, required: true },
    overriddenBy: { type: Schema.Types.ObjectId, ref: "User" },
    overrideReason: String,
    overriddenAt: Date,
  },
  { timestamps: true }
);

// Core query indexes
AttendanceEventSchema.index({ organizationId: 1, employeeId: 1, recordedAt: -1 });
AttendanceEventSchema.index({ organizationId: 1, recordedAt: -1 });
AttendanceEventSchema.index({ organizationId: 1, employeeId: 1, type: 1, recordedAt: -1 });
AttendanceEventSchema.index({ organizationId: 1, status: 1, recordedAt: -1 });
AttendanceEventSchema.index({ organizationId: 1, idempotencyKey: 1 }, { unique: true });
// Branch-level queries
AttendanceEventSchema.index({ "location.geofenceId": 1, recordedAt: -1 });

const AttendanceEvent: Model<IAttendanceEventDoc> =
  mongoose.models.AttendanceEvent ??
  mongoose.model<IAttendanceEventDoc>("AttendanceEvent", AttendanceEventSchema);

export default AttendanceEvent;
