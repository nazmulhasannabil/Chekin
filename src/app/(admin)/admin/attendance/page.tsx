import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceDay, Employee } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/attendance/status-badge";
import { formatDate, formatTime, formatMinutes } from "@/lib/utils";
import { ManualAttendanceDialog } from "./manual-attendance-dialog";
import { MonthLockControls } from "./month-lock-controls";
import type { AttendanceStatus } from "@/types";

async function AttendanceAdminData({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  const session = await requirePermission("attendance.read.all");
  await connectDB();

  const params = await searchParams;
  const dateKey = params.date ?? new Date().toISOString().split("T")[0];

  const records = await AttendanceDay.find({
    organizationId: session.organizationId,
    dateKey,
  })
    .populate("employeeId", "displayName employeeCode designation")
    .populate("adjustedBy", "name")
    .sort({ checkInAt: 1 })
    .lean();

  const filtered = params.status
    ? records.filter((r) => r.status === params.status)
    : records;

  const employees = await Employee.find({
    organizationId: session.organizationId,
    status: "ACTIVE",
  })
    .select("_id displayName employeeCode")
    .lean();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <p className="text-sm text-muted-foreground">{formatDate(dateKey)} · {filtered.length} records</p>
        </div>
        <div className="flex gap-2">
          <ManualAttendanceDialog
            employees={employees.map((e) => ({
              id: e._id.toString(),
              displayName: e.displayName,
              code: e.employeeCode,
            }))}
          />
          <MonthLockControls dateKey={dateKey} />
        </div>
      </div>

      <GlassCard padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Employee</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Check In</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Check Out</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Worked</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Adjusted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No records for this date
                  </td>
                </tr>
              )}
              {filtered.map((record) => {
                const emp = record.employeeId as Record<string, unknown>;
                const adjBy = record.adjustedBy as Record<string, unknown> | null;
                return (
                  <tr
                    key={record._id.toString()}
                    className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                      record.isLocked ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{emp?.displayName as string ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{emp?.employeeCode as string ?? ""}</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={record.status as AttendanceStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      {record.checkInAt ? formatTime(record.checkInAt) : "—"}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      {record.checkOutAt ? formatTime(record.checkOutAt) : "—"}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                      {formatMinutes(record.workedMinutes)}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {record.manuallyAdjusted && (
                        <span className="text-xs text-amber-400">
                          By {adjBy?.name as string ?? "HR"}
                        </span>
                      )}
                      {record.isLocked && (
                        <span className="text-xs text-muted-foreground ml-1">🔒</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

export default function AttendanceAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl bg-white/5" />}>
      <AttendanceAdminData searchParams={searchParams} />
    </Suspense>
  );
}
