import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/permissions";
import { getCurrentAttendanceState } from "@/actions/attendance";
import connectDB from "@/lib/db/connection";
import { Employee, AttendanceDay, AttendanceEvent } from "@/lib/db/models";
import { AttendancePage } from "./attendance-page";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

async function AttendanceData() {
  const session = await requireAuth();
  if (!session.employeeId) redirect("/login");

  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  })
    .populate("shiftId")
    .lean();

  if (!employee) redirect("/login?error=no_employee");

  const today = new Date();
  const dateKey = today.toISOString().split("T")[0];

  const todayRecord = await AttendanceDay.findOne({
    organizationId: session.organizationId,
    employeeId: employee._id,
    dateKey,
  }).lean();

  const recentEvents = await AttendanceEvent.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
  })
    .sort({ recordedAt: -1 })
    .limit(5)
    .lean();

  // Last 30 days summary
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthDays = await AttendanceDay.find({
    organizationId: session.organizationId,
    employeeId: employee._id,
    date: { $gte: thirtyDaysAgo },
  }).lean();

  const presentDays = monthDays.filter((d) =>
    ["PRESENT", "LATE", "OVERTIME"].includes(d.status)
  ).length;
  const totalWorkDays = monthDays.filter((d) =>
    !["WEEKEND", "HOLIDAY"].includes(d.status)
  ).length;
  const attendancePct = totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 100) : 0;

  return (
    <AttendancePage
      employee={{
        id: employee._id.toString(),
        displayName: employee.displayName,
        designation: employee.designation,
        profileImageUrl: employee.profileImageUrl,
      }}
      todayRecord={todayRecord ? {
        status: todayRecord.status,
        checkInAt: todayRecord.checkInAt?.toISOString(),
        checkOutAt: todayRecord.checkOutAt?.toISOString(),
        workedMinutes: todayRecord.workedMinutes,
        lateMinutes: todayRecord.lateMinutes,
        statusExplanation: todayRecord.statusExplanation,
      } : null}
      recentEvents={recentEvents.map((e) => ({
        id: e._id.toString(),
        type: e.type,
        recordedAt: e.recordedAt.toISOString(),
        status: e.status,
        workMode: e.workMode,
        source: e.source,
      }))}
      stats={{ presentDays, attendancePct }}
    />
  );
}

export default function AttendancePageWrapper() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <Suspense fallback={<AttendanceSkeleton />}>
        <AttendanceData />
      </Suspense>
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl bg-white/5" />
      <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
      <Skeleton className="h-32 w-full rounded-3xl bg-white/5" />
    </div>
  );
}
