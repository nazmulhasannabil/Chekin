import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceEvent } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime } from "@/lib/utils";
import { AnomalyReviewActions } from "./anomaly-review-actions";
import type { EventStatus } from "@/types";
import { AlertTriangle, Shield } from "lucide-react";

const ANOMALY_FLAG_LABELS: Record<string, string> = {
  DEVICE_SHARED: "Same device used by multiple employees",
  IMPOSSIBLE_TRAVEL: "Impossible geographic travel detected",
  REPEATED_FACE_FAILURES: "3+ face failures in last hour",
  LOCATION_CHANGED_DURING_CAPTURE: "Location changed during capture",
  UNUSUALLY_SHORT_SESSION: "Session under 5 minutes",
  MANY_CHECKINS_SAME_IP: "15+ check-ins from same IP",
  OUT_OF_WINDOW: "Check-in outside allowed window",
  SUSPECTED_REPLAY: "Suspected replay attack",
  SUSPICIOUS_DEVICE: "Unrecognized device characteristics",
};

async function AnomaliesData() {
  const session = await requirePermission("anomaly.review");
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingEvents = await AttendanceEvent.find({
    organizationId: session.organizationId,
    status: "PENDING_REVIEW",
    anomalyFlags: { $exists: true, $ne: [] },
  })
    .populate("employeeId", "displayName employeeCode")
    .sort({ recordedAt: -1 })
    .limit(50)
    .lean();

  const resolvedToday = await AttendanceEvent.countDocuments({
    organizationId: session.organizationId,
    status: { $in: ["ACCEPTED", "REJECTED"] },
    anomalyFlags: { $exists: true, $ne: [] },
    updatedAt: { $gte: today },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Anomaly Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          {pendingEvents.length} pending · {resolvedToday} resolved today
        </p>
      </div>

      {pendingEvents.length === 0 && (
        <GlassCard className="flex flex-col items-center py-12 text-center gap-3">
          <Shield className="h-10 w-10 text-emerald-400" />
          <p className="font-medium">No anomalies to review</p>
          <p className="text-sm text-muted-foreground">All attendance events have been cleared.</p>
        </GlassCard>
      )}

      {pendingEvents.map((event) => {
        const emp = event.employeeId as unknown as Record<string, unknown>;
        return (
          <GlassCard key={event._id.toString()}>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{emp?.displayName as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp?.employeeCode as string} · {event.type} · {formatDate(event.recordedAt)} {formatTime(event.recordedAt)}
                    </p>
                  </div>
                  <AnomalyReviewActions eventId={event._id.toString()} />
                </div>

                {/* Anomaly flags */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {event.anomalyFlags?.map((flag) => (
                    <span
                      key={flag}
                      className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400"
                    >
                      {ANOMALY_FLAG_LABELS[flag] ?? flag}
                    </span>
                  ))}
                </div>

                {/* Confidence score */}
                {event.verification && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Face: {event.verification.faceScore ? `${Math.round(event.verification.faceScore * 100)}%` : "N/A"}</span>
                    <span>Device: {event.verification.deviceTrusted ? "Trusted" : "Untrusted"}</span>
                    <span>Confidence: {Math.round((event.verification.confidenceScore ?? 0) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

export default function AnomaliesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
      <AnomaliesData />
    </Suspense>
  );
}
