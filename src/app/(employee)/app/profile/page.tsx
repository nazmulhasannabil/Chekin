import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee, PushSubscription } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationSettings } from "./notification-settings";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

async function ProfileData() {
  const session = await requireAuth();
  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
  })
    .populate("branch", "name")
    .populate("department", "name")
    .populate("shiftId", "name startTime endTime")
    .lean();

  if (!employee) redirect("/login?error=no_employee");

  const branch = employee.branch as unknown as Record<string, unknown> | null;
  const dept = employee.department as unknown as Record<string, unknown> | null;
  const shift = employee.shiftId as unknown as Record<string, unknown> | null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Profile</h1>

      {/* Profile info */}
      <GlassCard>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-xl">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{employee.displayName}</h2>
            <p className="text-sm text-muted-foreground">{employee.designation ?? "Employee"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{employee.employeeCode}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Branch</p>
            <p>{branch?.name as string ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p>{dept?.name as string ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift</p>
            <p>
              {shift
                ? `${shift.name as string} (${shift.startTime as string}–${shift.endTime as string})`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p>{formatDate(employee.employmentStartDate)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Notification settings */}
      <GlassCard>
        <p className="text-sm font-medium mb-3">Notification Settings</p>
        <NotificationSettings />
      </GlassCard>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
        <ProfileData />
      </Suspense>
    </div>
  );
}
