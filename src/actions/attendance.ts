"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/db/connection";
import { AttendanceEvent, AttendanceDay, Employee, Shift, Holiday, Device } from "@/lib/db/models";
import { requireAuth } from "@/lib/auth/permissions";
import { evaluateAttendance } from "@/lib/rules/attendance-rules";
import { calculateConfidenceScore, buildPasskeyOnlyConfidence } from "@/lib/rules/confidence-score";
import { detectAnomalies } from "@/lib/rules/anomaly";
import { rateLimit } from "@/lib/redis/rate-limit";
import { toDateKey } from "@/lib/utils";
import type { AttendanceEventType, EventStatus, WorkMode } from "@/types";

export interface CheckInInput {
  type: AttendanceEventType;
  workMode?: WorkMode;
  workLocationNote?: string;
  idempotencyKey: string;
  deviceFingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  // Set when face verification is complete (Phase 2)
  faceVerification?: {
    challengeId: string;
    faceMatched: boolean;
    faceScore: number;
    livenessPassed: boolean;
  };
}

export interface AttendanceActionResult {
  success: boolean;
  eventId?: string;
  status?: EventStatus;
  statusExplanation?: string;
  error?: string;
}

export async function recordAttendanceEvent(
  input: CheckInInput
): Promise<AttendanceActionResult> {
  try {
    const session = await requireAuth();
    await connectDB();

    // Rate limit: max 10 check-in attempts per 5 minutes
    const rl = await rateLimit(`checkin:${session.userId}`, 10, 300);
    if (!rl.allowed) {
      return { success: false, error: "Too many requests. Please wait a few minutes." };
    }

    // Get employee record
    const employee = await Employee.findOne({
      organizationId: session.organizationId,
      userId: session.userId,
    }).lean();

    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    // Idempotency check — prevent duplicates
    const existing = await AttendanceEvent.findOne({
      organizationId: session.organizationId,
      idempotencyKey: input.idempotencyKey,
    }).lean();

    if (existing) {
      return {
        success: true,
        eventId: existing._id.toString(),
        status: existing.status,
        statusExplanation: "Duplicate request — event already recorded.",
      };
    }

    // Get current shift
    const shift = employee.shiftId
      ? await Shift.findOne({ _id: employee.shiftId, isActive: true }).lean()
      : null;

    // Use SERVER timestamp — never trust client
    const recordedAt = new Date();
    const dateKey = toDateKey(recordedAt);

    // Check holiday
    const holiday = await Holiday.findOne({
      organizationId: session.organizationId,
      dateKey,
      $or: [{ branchId: null }, { branchId: employee.branch }],
    }).lean();

    // Get device trust
    let deviceId: string | undefined;
    let deviceTrusted = false;

    if (input.deviceFingerprint) {
      const device = await Device.findOne({
        organizationId: session.organizationId,
        employeeId: employee._id,
        fingerprint: input.deviceFingerprint,
        revokedAt: null,
      }).lean();

      if (device) {
        deviceId = device._id.toString();
        deviceTrusted = device.trusted;
        // Update last seen
        await Device.updateOne(
          { _id: device._id },
          { lastSeenAt: recordedAt, lastSeenIp: await getIpFromHeaders() }
        );
      } else if (input.deviceFingerprint) {
        // Register new device (untrusted by default)
        const reqHeaders = await headers();
        const newDevice = await Device.create({
          organizationId: session.organizationId,
          employeeId: employee._id,
          fingerprint: input.deviceFingerprint,
          userAgent: reqHeaders.get("user-agent") ?? "unknown",
          trusted: false,
          lastSeenAt: recordedAt,
          lastSeenIp: await getIpFromHeaders(),
        });
        deviceId = newDevice._id.toString();
      }
    }

    // Geofence check
    let insideAllowedArea = false;
    if (input.location && employee.branch) {
      const { Branch } = await import("@/lib/db/models");
      const branch = await Branch.findById(employee.branch).lean();
      if (branch?.geofence) {
        const { haversineKm } = await import("@/lib/utils");
        const distKm = haversineKm(
          branch.geofence.latitude,
          branch.geofence.longitude,
          input.location.latitude,
          input.location.longitude
        );
        insideAllowedArea = distKm * 1000 <= branch.geofence.radiusMeters;
      }
    }

    // Build confidence score
    const confidenceResult = input.faceVerification
      ? calculateConfidenceScore({
          faceMatched: input.faceVerification.faceMatched,
          faceScore: input.faceVerification.faceScore,
          livenessPassed: input.faceVerification.livenessPassed,
          deviceTrusted,
          insideGeofence: insideAllowedArea,
          knownIp: false,
        })
      : calculateConfidenceScore(
          buildPasskeyOnlyConfidence(deviceTrusted, insideAllowedArea, false)
        );

    // Anomaly detection
    const recentEvents = await AttendanceEvent.find({
      organizationId: session.organizationId,
      employeeId: employee._id,
      recordedAt: { $gte: new Date(Date.now() - 86400000) },
    })
      .sort({ recordedAt: -1 })
      .limit(20)
      .lean();

    const ipAddress = await getIpFromHeaders();
    const recentEventsForIp = ipAddress
      ? await AttendanceEvent.find({
          organizationId: session.organizationId,
          ipAddress,
          recordedAt: { $gte: new Date(Date.now() - 1800000) },
        })
          .limit(20)
          .lean()
      : [];

    const anomalyResult = detectAnomalies({
      event: {
        type: input.type,
        employeeId: employee._id,
        recordedAt,
        location: input.location ? { ...input.location, insideAllowedArea } : undefined,
        verification: { ...confidenceResult.breakdown, faceMatched: input.faceVerification?.faceMatched ?? false, deviceTrusted, confidenceScore: confidenceResult.score },
      },
      recentEventsForEmployee: recentEvents,
      recentEventsForIp,
    });

    // Determine event status
    let eventStatus: EventStatus = "ACCEPTED";
    const rejectionReasons: string[] = [];

    if (anomalyResult.shouldPendReview) {
      eventStatus = "PENDING_REVIEW";
      rejectionReasons.push(...anomalyResult.flags);
    }

    if (input.faceVerification && !confidenceResult.passed) {
      eventStatus = "PENDING_REVIEW";
      rejectionReasons.push(`Low confidence score: ${Math.round(confidenceResult.score * 100)}%`);
    }

    // Create the attendance event
    const event = await AttendanceEvent.create({
      organizationId: session.organizationId,
      employeeId: employee._id,
      type: input.type,
      recordedAt,
      source: input.faceVerification ? "FACE" : "PASSKEY",
      workMode: input.workMode ?? "OFFICE",
      workLocationNote: input.workLocationNote,
      shiftId: employee.shiftId,
      deviceId,
      location: input.location
        ? {
            ...input.location,
            geofenceId: employee.branch,
            insideAllowedArea,
          }
        : undefined,
      verification: {
        faceMatched: input.faceVerification?.faceMatched ?? false,
        faceScore: input.faceVerification?.faceScore,
        livenessPassed: input.faceVerification?.livenessPassed,
        deviceTrusted,
        confidenceScore: confidenceResult.score,
        breakdown: confidenceResult.breakdown,
      },
      status: eventStatus,
      rejectionReasons,
      statusExplanation: confidenceResult.explanation,
      ipAddress,
      anomalyFlags: anomalyResult.flags,
      idempotencyKey: input.idempotencyKey,
    });

    // Update daily summary if this is a check-in or checkout
    if (input.type === "CHECK_IN" || input.type === "CHECK_OUT") {
      await upsertDailySummary(
        session.organizationId,
        employee._id.toString(),
        dateKey,
        recordedAt,
        input.type,
        shift,
        Boolean(holiday),
        event._id.toString()
      );
    }

    return {
      success: true,
      eventId: event._id.toString(),
      status: eventStatus,
      statusExplanation: confidenceResult.explanation,
    };
  } catch (err) {
    console.error("[recordAttendanceEvent]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") return { success: false, error: "Not authenticated." };
    return { success: false, error: "Failed to record attendance. Please try again." };
  }
}

async function getIpFromHeaders(): Promise<string> {
  const reqHeaders = await headers();
  return (
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    "unknown"
  );
}

async function upsertDailySummary(
  organizationId: string,
  employeeId: string,
  dateKey: string,
  recordedAt: Date,
  type: AttendanceEventType,
  shift: Awaited<ReturnType<typeof Shift.findOne>>,
  isHoliday: boolean,
  eventId: string
) {
  const existing = await AttendanceDay.findOne({
    organizationId,
    employeeId,
    dateKey,
  });

  if (type === "CHECK_IN") {
    const update: Record<string, unknown> = {
      checkInAt: recordedAt,
      firstEventId: eventId,
      status: "PRESENT",
    };

    if (isHoliday) {
      update.status = "HOLIDAY";
    }

    await AttendanceDay.findOneAndUpdate(
      { organizationId, employeeId, dateKey },
      {
        $set: update,
        $setOnInsert: {
          date: recordedAt,
          shiftId: shift?._id,
          workedMinutes: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          breakMinutes: 0,
          manuallyAdjusted: false,
        },
      },
      { upsert: true, new: true }
    );
  } else if (type === "CHECK_OUT" && existing) {
    const checkInAt = existing.checkInAt;
    if (!checkInAt || !shift) return;

    const ruleResult = evaluateAttendance({
      checkInAt,
      checkOutAt: recordedAt,
      shift,
      isHoliday,
      isLeave: existing.status === "ON_LEAVE",
      timezone: "Asia/Dhaka",
    });

    await AttendanceDay.findOneAndUpdate(
      { organizationId, employeeId, dateKey },
      {
        $set: {
          checkOutAt: recordedAt,
          lastEventId: eventId,
          status: ruleResult.status,
          workedMinutes: ruleResult.workedMinutes,
          lateMinutes: ruleResult.lateMinutes,
          earlyLeaveMinutes: ruleResult.earlyLeaveMinutes,
          overtimeMinutes: ruleResult.overtimeMinutes,
          statusExplanation: ruleResult.explanation,
        },
      }
    );
  }
}

export async function getCurrentAttendanceState(employeeId: string, organizationId: string) {
  await connectDB();
  const dateKey = toDateKey(new Date());

  const day = await AttendanceDay.findOne({
    organizationId,
    employeeId,
    dateKey,
  }).lean();

  const lastEvent = await AttendanceEvent.findOne({
    organizationId,
    employeeId,
    recordedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  })
    .sort({ recordedAt: -1 })
    .lean();

  return { day, lastEvent };
}
