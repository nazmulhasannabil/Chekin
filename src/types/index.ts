import type { Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AttendanceEventType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "BREAK_START"
  | "BREAK_END";

export type AttendanceSource = "FACE" | "PASSKEY" | "MANUAL" | "OFFLINE_SYNC";

export type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "ON_LEAVE"
  | "REMOTE"
  | "FIELD_VISIT"
  | "WEEKEND"
  | "HOLIDAY"
  | "HALF_DAY"
  | "EARLY_LEAVE"
  | "OVERTIME"
  | "MISSING_CHECKOUT"
  | "PENDING_REVIEW"
  | "REJECTED";

export type EventStatus = "ACCEPTED" | "PENDING_REVIEW" | "REJECTED";

export type WorkMode = "OFFICE" | "REMOTE" | "FIELD_VISIT" | "CLIENT_SITE";

export type Role =
  | "SUPER_ADMIN"
  | "HR_ADMIN"
  | "BRANCH_ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "AUDITOR";

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type NotificationChannel = "PUSH" | "EMAIL" | "IN_APP";

export type ExportJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

// ─── Permission strings ────────────────────────────────────────────────────────

export type Permission =
  | "employee.read"
  | "employee.create"
  | "employee.update"
  | "employee.delete"
  | "attendance.read.self"
  | "attendance.read.team"
  | "attendance.read.all"
  | "attendance.override"
  | "attendance.export"
  | "shift.manage"
  | "leave.request"
  | "leave.approve"
  | "correction.request"
  | "correction.approve"
  | "audit.read"
  | "biometric.enroll"
  | "biometric.manage"
  | "organization.manage"
  | "report.generate"
  | "branch.manage"
  | "department.manage"
  | "role.manage"
  | "anomaly.review";

// ─── Role → Permission mapping ────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "employee.read",
    "employee.create",
    "employee.update",
    "employee.delete",
    "attendance.read.all",
    "attendance.override",
    "attendance.export",
    "shift.manage",
    "leave.approve",
    "correction.approve",
    "audit.read",
    "biometric.manage",
    "organization.manage",
    "report.generate",
    "branch.manage",
    "department.manage",
    "role.manage",
    "anomaly.review",
  ],
  HR_ADMIN: [
    "employee.read",
    "employee.create",
    "employee.update",
    "attendance.read.all",
    "attendance.override",
    "attendance.export",
    "shift.manage",
    "leave.approve",
    "correction.approve",
    "audit.read",
    "biometric.enroll",
    "biometric.manage",
    "report.generate",
    "branch.manage",
    "department.manage",
    "anomaly.review",
  ],
  BRANCH_ADMIN: [
    "employee.read",
    "employee.update",
    "attendance.read.all",
    "attendance.override",
    "attendance.export",
    "correction.approve",
    "report.generate",
    "anomaly.review",
  ],
  MANAGER: [
    "employee.read",
    "attendance.read.team",
    "attendance.export",
    "correction.approve",
    "leave.approve",
    "report.generate",
  ],
  EMPLOYEE: [
    "attendance.read.self",
    "correction.request",
    "leave.request",
  ],
  AUDITOR: [
    "employee.read",
    "attendance.read.all",
    "audit.read",
    "report.generate",
  ],
};

// ─── Mongoose ID helper ───────────────────────────────────────────────────────

export type MongoId = Types.ObjectId | string;

// ─── Session user (returned by Better Auth) ──────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  employeeId?: string;
  role: Role;
  image?: string;
}

// ─── Attendance event interfaces ─────────────────────────────────────────────

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  geofenceId?: string;
  insideAllowedArea: boolean;
}

export interface AttendanceVerification {
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
}

export interface IAttendanceEvent {
  _id: MongoId;
  organizationId: MongoId;
  employeeId: MongoId;
  type: AttendanceEventType;
  recordedAt: Date;
  source: AttendanceSource;
  workMode?: WorkMode;
  workLocationNote?: string;
  shiftId?: MongoId;
  deviceId?: MongoId;
  location?: AttendanceLocation;
  verification?: AttendanceVerification;
  status: EventStatus;
  rejectionReasons: string[];
  statusExplanation?: string;
  idempotencyKey: string;
  ipAddress?: string;
  anomalyFlags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Confidence score engine ──────────────────────────────────────────────────

export interface ConfidenceInput {
  faceMatched: boolean;
  faceScore: number;
  livenessPassed: boolean;
  deviceTrusted: boolean;
  insideGeofence: boolean;
  knownIp: boolean;
  weights?: ConfidenceWeights;
}

export interface ConfidenceWeights {
  face: number;       // default 0.35
  liveness: number;   // default 0.25
  device: number;     // default 0.15
  geofence: number;   // default 0.15
  network: number;    // default 0.10
}

// ─── Shift ────────────────────────────────────────────────────────────────────

export interface IShift {
  _id: MongoId;
  organizationId: MongoId;
  name: string;
  startTime: string;        // "09:00"
  endTime: string;          // "18:00"
  checkInOpenMinutes: number;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  minWorkingHours: number;
  breakAllowanceMinutes: number;
  overtimeAfterMinutes: number;
  earlyLeaveThresholdMinutes: number;
  isOvernight: boolean;
  weeklyHolidays: number[]; // 0=Sunday … 6=Saturday
  locationRestricted: boolean;
  remoteAllowed: boolean;
  branchIds: MongoId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
