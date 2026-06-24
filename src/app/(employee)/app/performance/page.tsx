import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee, AttendanceDay, CorrectionRequest } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/attendance/status-badge";
import { formatMinutes, formatDate } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import { redirect } from "next/navigation";
import { PerformanceCharts } from "./performance-charts";

interface DaySummary {
  dateKey: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes: number;
  lateMinutes: number;
}

async function PerformanceData() {
  const session = await requireAuth();
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  }).lean();

  if (!employee) redirect("/login?error=no_employee");

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const days = await AttendanceDay.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
    date: { $gte: startOfMonth },
  })
    .sort({ date: -1 })
    .lean();

  const correctionRequests = await CorrectionRequest.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Compute stats
  const workDays = days.filter((d) => !["WEEKEND", "HOLIDAY"].includes(d.status));
  const presentDays = days.filter((d) => ["PRESENT", "LATE", "OVERTIME"].includes(d.status));
  const absentDays = workDays.filter((d) => d.status === "ABSENT");
  const leaveDays = days.filter((d) => d.status === "ON_LEAVE");
  const remoteDays = days.filter((d) => d.status === "REMOTE");
  const lateDays = days.filter((d) => d.status === "LATE");
  const totalLateMinutes = days.reduce((sum, d) => sum + (d.lateMinutes || 0), 0);
  const totalOvertimeMinutes = days.reduce((sum, d) => sum + (d.overtimeMinutes || 0), 0);
  const missingCheckouts = days.filter((d) => d.status === "MISSING_CHECKOUT");
  const totalWorkedMinutes = days.reduce((sum, d) => sum + (d.workedMinutes || 0), 0);

  const avgArrivalMinutes = presentDays.length > 0
    ? presentDays
        .filter((d) => d.checkInAt)
        .reduce((sum, d) => {
          const t = new Date(d.checkInAt!);
          return sum + t.getHours() * 60 + t.getMinutes();
        }, 0) / presentDays.length
    : 0;

  const avgArrivalTime = avgArrivalMinutes > 0
    ? `${Math.floor(avgArrivalMinutes / 60).toString().padStart(2, "0")}:${Math.floor(avgArrivalMinutes % 60).toString().padStart(2, "0")}`
    : "—";

  const attendancePct =
    workDays.length > 0 ? Math.round((presentDays.length / workDays.length) * 100) : 0;
  const onTimePct =
    presentDays.length > 0
      ? Math.round(((presentDays.length - lateDays.length) / presentDays.length) * 100)
      : 0;

  const serializedDays: DaySummary[] = days.map((d) => ({
    dateKey: d.dateKey,
    status: d.status,
    checkInAt: d.checkInAt?.toISOString(),
    checkOutAt: d.checkOutAt?.toISOString(),
    workedMinutes: d.workedMinutes,
    lateMinutes: d.lateMinutes,
  }));

  const stats = {
    presentDays: presentDays.length,
    absentDays: absentDays.length,
    leaveDays: leaveDays.length,
    remoteDays: remoteDays.length,
    attendancePct,
    onTimePct,
    totalLateMinutes,
    avgArrivalTime,
    overtimeMinutes: totalOvertimeMinutes,
    missingCheckouts: missingCheckouts.length,
    totalWorkedMinutes,
    totalWorkDays: workDays.length,
  };

  const serializedCorrections = correctionRequests.map((c) => ({
    id: c._id.toString(),
    reason: c.reason,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">My Performance</h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Present Days" value={stats.presentDays} color="text-emerald-400" />
        <StatCard label="Absent Days" value={stats.absentDays} color="text-red-400" />
        <StatCard label="Leave Days" value={stats.leaveDays} color="text-sky-400" />
        <StatCard label="Remote Days" value={stats.remoteDays} color="text-violet-400" />
        <StatCard label="Attendance %" value={`${stats.attendancePct}%`} color="text-primary" />
        <StatCard label="On-Time %" value={`${stats.onTimePct}%`} color="text-emerald-400" />
        <StatCard label="Late Minutes" value={formatMinutes(stats.totalLateMinutes)} color="text-amber-400" />
        <StatCard label="Avg Arrival" value={stats.avgArrivalTime} color="text-foreground" />
        <StatCard label="Overtime" value={formatMinutes(stats.overtimeMinutes)} color="text-indigo-400" />
        <StatCard label="Missing Checkouts" value={stats.missingCheckouts} color="text-orange-400" />
      </div>

      {/* Monthly calendar */}
      <GlassCard>
        <p className="text-sm font-medium mb-3">Monthly Calendar</p>
        <PerformanceCharts days={serializedDays} />
      </GlassCard>

      {/* Correction request status */}
      {serializedCorrections.length > 0 && (
        <GlassCard>
          <p className="text-sm font-medium mb-3">Correction Requests</p>
          <div className="space-y-2">
            {serializedCorrections.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-foreground">{c.reason.slice(0, 40)}</p>
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
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <GlassCard padding="sm" className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </GlassCard>
  );
}

export default function PerformancePage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 bg-white/5" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-3xl bg-white/5" />
              ))}
            </div>
          </div>
        }
      >
        <PerformanceData />
      </Suspense>
    </div>
  );
}
