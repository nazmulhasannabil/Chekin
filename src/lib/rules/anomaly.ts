import type { IAttendanceEventDoc } from "@/lib/db/models/attendanceEvent.model";
import { haversineKm } from "@/lib/utils";

export type AnomalyFlag =
  | "DEVICE_SHARED"
  | "IMPOSSIBLE_TRAVEL"
  | "REPEATED_FACE_FAILURES"
  | "LOCATION_CHANGED_DURING_CAPTURE"
  | "UNUSUALLY_SHORT_SESSION"
  | "MANY_CHECKINS_SAME_IP"
  | "OUT_OF_WINDOW"
  | "SUSPECTED_REPLAY"
  | "SUSPICIOUS_DEVICE";

export interface AnomalyDetectionInput {
  event: Partial<IAttendanceEventDoc>;
  recentEventsForEmployee: IAttendanceEventDoc[];
  recentEventsForDevice?: IAttendanceEventDoc[];
  recentEventsForIp?: IAttendanceEventDoc[];
}

export interface AnomalyResult {
  flags: AnomalyFlag[];
  shouldPendReview: boolean;
}

export function detectAnomalies(input: AnomalyDetectionInput): AnomalyResult {
  const flags: AnomalyFlag[] = [];
  const { event, recentEventsForEmployee, recentEventsForDevice, recentEventsForIp } = input;

  // 1. Same device used by multiple employees
  if (recentEventsForDevice && recentEventsForDevice.length > 0) {
    const otherEmployees = recentEventsForDevice.filter(
      (e) => e.employeeId?.toString() !== event.employeeId?.toString()
    );
    if (otherEmployees.length > 0) {
      flags.push("DEVICE_SHARED");
    }
  }

  // 2. Impossible travel — check against last known location
  if (event.location && recentEventsForEmployee.length > 0) {
    const lastEvent = recentEventsForEmployee.find((e) => e.location);
    if (lastEvent?.location && event.recordedAt && lastEvent.recordedAt) {
      const distKm = haversineKm(
        lastEvent.location.latitude,
        lastEvent.location.longitude,
        event.location.latitude,
        event.location.longitude
      );
      const timeDiffHours =
        (new Date(event.recordedAt).getTime() - new Date(lastEvent.recordedAt).getTime()) /
        3600000;
      // > 100 km in < 30 minutes is impossible
      if (distKm > 100 && timeDiffHours < 0.5) {
        flags.push("IMPOSSIBLE_TRAVEL");
      }
    }
  }

  // 3. Repeated face-match failures (3+ in last hour)
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentFailures = recentEventsForEmployee.filter(
    (e) =>
      e.status === "REJECTED" &&
      e.verification?.faceMatched === false &&
      new Date(e.recordedAt) > oneHourAgo
  );
  if (recentFailures.length >= 3) {
    flags.push("REPEATED_FACE_FAILURES");
  }

  // 4. Unusually short session (check-in and checkout within 5 minutes)
  if (event.type === "CHECK_OUT" && recentEventsForEmployee.length > 0) {
    const lastCheckIn = recentEventsForEmployee
      .slice()
      .reverse()
      .find((e) => e.type === "CHECK_IN");
    if (lastCheckIn && event.recordedAt) {
      const sessionMinutes =
        (new Date(event.recordedAt).getTime() - new Date(lastCheckIn.recordedAt).getTime()) /
        60000;
      if (sessionMinutes < 5) {
        flags.push("UNUSUALLY_SHORT_SESSION");
      }
    }
  }

  // 5. Many employees checking in from same external IP (> 15 in 30 min)
  if (recentEventsForIp && recentEventsForIp.length > 15) {
    const thirtyMinAgo = new Date(Date.now() - 1800000);
    const recent = recentEventsForIp.filter(
      (e) => new Date(e.recordedAt) > thirtyMinAgo
    );
    if (recent.length > 15) {
      flags.push("MANY_CHECKINS_SAME_IP");
    }
  }

  return {
    flags,
    shouldPendReview: flags.length > 0,
  };
}
