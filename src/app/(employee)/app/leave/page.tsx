import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { LeaveRequest, Employee } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ApplyLeaveDialog } from "./apply-leave-dialog";
import type { LeaveStatus } from "@/types";

async function LeaveData() {
  const session = await requireAuth();
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  }).lean();

  if (!employee) redirect("/login?error=no_employee");

  const leaveRequests = await LeaveRequest.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Simple leave balance (actual accrual rules would be configured in org settings)
  const thisYear = new Date().getFullYear();
  const approvedLeave = leaveRequests.filter(
    (l) =>
      l.status === "APPROVED" &&
      new Date(l.startDate).getFullYear() === thisYear
  );
  const usedDays = approvedLeave.reduce((s, l) => s + l.totalDays, 0);
  const annualAllowance = 15;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Leave</h1>
        <ApplyLeaveDialog />
      </div>

      {/* Balance */}
      <GlassCard>
        <p className="text-sm font-medium mb-3">Leave Balance {thisYear}</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-sky-400">{annualAllowance - usedDays}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{usedDays}</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{annualAllowance}</p>
            <p className="text-xs text-muted-foreground">Entitlement</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${Math.min(100, (usedDays / annualAllowance) * 100)}%` }}
          />
        </div>
      </GlassCard>

      {/* Leave history */}
      {leaveRequests.length === 0 && (
        <GlassCard>
          <p className="text-sm text-muted-foreground text-center py-6">No leave requests yet.</p>
        </GlassCard>
      )}

      {leaveRequests.map((lr) => (
        <GlassCard key={lr._id.toString()}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{lr.leaveType.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(lr.startDate)} – {formatDate(lr.endDate)} ({lr.totalDays} day{lr.totalDays > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground mt-1">{lr.reason}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                lr.status === "APPROVED"
                  ? "status-present"
                  : lr.status === "REJECTED"
                  ? "status-absent"
                  : lr.status === "CANCELLED"
                  ? "status-weekend"
                  : "status-review"
              }`}
            >
              {lr.status}
            </span>
          </div>
          {lr.reviewComment && (
            <p className="mt-2 text-xs text-muted-foreground bg-white/5 rounded-xl px-3 py-2">
              {lr.reviewComment}
            </p>
          )}
        </GlassCard>
      ))}
    </div>
  );
}

export default function LeavePage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
        <LeaveData />
      </Suspense>
    </div>
  );
}
