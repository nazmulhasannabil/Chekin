import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceDay, Employee, CorrectionRequest, AttendanceEvent } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboardCharts } from "./dashboard-charts";

async function DashboardData() {
  const session = await requirePermission("attendance.read.all");
  await connectDB();

  const today = new Date();
  const dateKey = today.toISOString().split("T")[0];
  const orgId = session.organizationId;

  const [
    totalEmployees,
    todayRecords,
    pendingCorrections,
    recentAnomalies,
    monthlyDays,
  ] = await Promise.all([
    Employee.countDocuments({ organizationId: orgId, status: "ACTIVE" }),
    AttendanceDay.find({ organizationId: orgId, dateKey }).lean(),
    CorrectionRequest.countDocuments({ organizationId: orgId, status: "PENDING" }),
    AttendanceEvent.countDocuments({
      organizationId: orgId,
      anomalyFlags: { $exists: true, $ne: [] },
      recordedAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
    }),
    // Last 30 days for trend chart — aggregate by day and status
    AttendanceDay.aggregate([
      {
        $match: {
          organizationId: orgId,
          date: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
          status: { $in: ["PRESENT", "LATE", "ABSENT"] },
        },
      },
      {
        $group: {
          _id: { dateKey: "$dateKey", status: "$status" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.dateKey": 1 } },
    ]),
  ]);

  const checkedIn = todayRecords.filter((r) =>
    ["PRESENT", "LATE", "OVERTIME", "REMOTE", "FIELD_VISIT"].includes(r.status)
  ).length;
  const notCheckedIn = totalEmployees - checkedIn;
  const lateToday = todayRecords.filter((r) => r.status === "LATE").length;
  const onLeave = todayRecords.filter((r) => r.status === "ON_LEAVE").length;
  const remote = todayRecords.filter((r) => r.status === "REMOTE").length;
  const missingCheckouts = todayRecords.filter((r) => r.status === "MISSING_CHECKOUT").length;

  // Transform trend data for chart
  const trendMap = new Map<string, { date: string; present: number; late: number; absent: number }>();
  for (const entry of monthlyDays) {
    const key = entry._id.dateKey as string;
    if (!trendMap.has(key)) {
      trendMap.set(key, { date: key, present: 0, late: 0, absent: 0 });
    }
    const status = (entry._id.status as string).toLowerCase() as "present" | "late" | "absent";
    const obj = trendMap.get(key)!;
    if (status in obj) {
      (obj as Record<string, unknown>)[status] = entry.count;
    }
  }
  const trendData = Array.from(trendMap.values()).slice(-14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={totalEmployees} color="text-foreground" />
        <StatCard label="Checked In" value={checkedIn} color="text-emerald-400" />
        <StatCard label="Not Checked In" value={notCheckedIn} color="text-red-400" />
        <StatCard label="Late Today" value={lateToday} color="text-amber-400" />
        <StatCard label="On Leave" value={onLeave} color="text-sky-400" />
        <StatCard label="Remote" value={remote} color="text-violet-400" />
        <StatCard label="Missing Checkouts" value={missingCheckouts} color="text-orange-400" />
        <StatCard label="Pending Corrections" value={pendingCorrections} color="text-yellow-400" />
        <StatCard label="Suspicious Attempts" value={recentAnomalies} color="text-red-400" />
      </div>

      {/* Attendance trend chart */}
      <GlassCard>
        <p className="text-sm font-semibold mb-4">14-Day Attendance Trend</p>
        <AdminDashboardCharts trendData={trendData} />
      </GlassCard>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <GlassCard padding="md">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </GlassCard>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl bg-white/5" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardData />
    </Suspense>
  );
}
