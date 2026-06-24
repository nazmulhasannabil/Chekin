import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { CorrectionRequest, Employee, AttendanceDay } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { SubmitCorrectionDialog } from "./submit-correction-dialog";
import type { CorrectionStatus } from "@/types";

async function CorrectionsData() {
  const session = await requireAuth();
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  }).lean();

  if (!employee) redirect("/login?error=no_employee");

  const corrections = await CorrectionRequest.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const recentDays = await AttendanceDay.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
  })
    .sort({ date: -1 })
    .limit(10)
    .select("_id dateKey status checkInAt checkOutAt")
    .lean();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Corrections</h1>
        <SubmitCorrectionDialog
          recentDays={recentDays.map((d) => ({
            id: d._id.toString(),
            dateKey: d.dateKey,
            status: d.status,
            checkInAt: d.checkInAt?.toISOString(),
            checkOutAt: d.checkOutAt?.toISOString(),
          }))}
        />
      </div>

      {corrections.length === 0 && (
        <GlassCard>
          <p className="text-sm text-muted-foreground text-center py-6">
            No correction requests yet.
          </p>
        </GlassCard>
      )}

      {corrections.map((c) => (
        <GlassCard key={c._id.toString()}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium">{c.reason.slice(0, 80)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(c.createdAt)}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                c.status === "APPROVED"
                  ? "status-present"
                  : c.status === "REJECTED"
                  ? "status-absent"
                  : "status-review"
              }`}
            >
              {c.status}
            </span>
          </div>

          {(c.requestedCheckIn || c.requestedCheckOut) && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
              {c.requestedCheckIn && (
                <div>
                  <span className="text-foreground/60">Requested In:</span>{" "}
                  {new Date(c.requestedCheckIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              {c.requestedCheckOut && (
                <div>
                  <span className="text-foreground/60">Requested Out:</span>{" "}
                  {new Date(c.requestedCheckOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          )}

          {c.reviewComment && (
            <p className="mt-2 text-xs bg-white/5 rounded-xl px-3 py-2 text-muted-foreground">
              HR: {c.reviewComment}
            </p>
          )}
        </GlassCard>
      ))}
    </div>
  );
}

export default function CorrectionsPage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
        <CorrectionsData />
      </Suspense>
    </div>
  );
}
