import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceDay, Employee, Branch, Department } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveBoardClient } from "./live-board-client";
import type { AttendanceStatus } from "@/types";

async function LiveBoardData() {
  const session = await requirePermission("attendance.read.all");
  await connectDB();

  const today = new Date();
  const dateKey = today.toISOString().split("T")[0];
  const orgId = session.organizationId;

  const [attendanceDays, employees, branches, departments] = await Promise.all([
    AttendanceDay.find({ organizationId: orgId, dateKey })
      .populate("employeeId", "displayName employeeCode designation branch department profileImageUrl")
      .lean(),
    Employee.countDocuments({ organizationId: orgId, status: "ACTIVE" }),
    Branch.find({ organizationId: orgId, isActive: true }).select("name code").lean(),
    Department.find({ organizationId: orgId, isActive: true }).select("name code").lean(),
  ]);

  const records = attendanceDays.map((day) => {
    const emp = day.employeeId as Record<string, unknown>;
    return {
      id: day._id.toString(),
      employeeId: emp?._id?.toString() ?? "",
      displayName: (emp?.displayName as string) ?? "Unknown",
      employeeCode: (emp?.employeeCode as string) ?? "",
      designation: (emp?.designation as string) ?? "",
      status: day.status as AttendanceStatus,
      checkInAt: day.checkInAt?.toISOString(),
      checkOutAt: day.checkOutAt?.toISOString(),
      workedMinutes: day.workedMinutes,
      workMode: "OFFICE" as const,
    };
  });

  return (
    <LiveBoardClient
      initialRecords={records}
      totalEmployees={employees}
      branches={branches.map((b) => ({ id: b._id.toString(), name: b.name, code: b.code }))}
      departments={departments.map((d) => ({ id: d._id.toString(), name: d.name, code: d.code }))}
    />
  );
}

export default function LiveBoardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Live Attendance Board</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl bg-white/5" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        }
      >
        <LiveBoardData />
      </Suspense>
    </div>
  );
}
