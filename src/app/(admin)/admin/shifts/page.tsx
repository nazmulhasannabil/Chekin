import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Shift, Holiday } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftFormDialog } from "./shift-form-dialog";
import { HolidayFormDialog } from "./holiday-form-dialog";
import { formatDate } from "@/lib/utils";

async function ShiftsData() {
  const session = await requirePermission("shift.manage");
  await connectDB();

  const today = new Date();
  const year = today.getFullYear();

  const [shifts, holidays] = await Promise.all([
    Shift.find({ organizationId: session.organizationId })
      .sort({ name: 1 })
      .lean(),
    Holiday.find({
      organizationId: session.organizationId,
      date: {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31),
      },
    })
      .sort({ date: 1 })
      .lean(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shifts & Holidays</h1>
        <div className="flex gap-2">
          <ShiftFormDialog />
          <HolidayFormDialog />
        </div>
      </div>

      {/* Shifts */}
      <GlassCard>
        <p className="text-sm font-semibold mb-4">Shifts ({shifts.length})</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift) => (
            <div
              key={shift._id.toString()}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: shift.color ?? "#6366f1" }}
                />
                <p className="font-medium">{shift.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {shift.startTime} – {shift.endTime}
                {shift.isOvernight && " (overnight)"}
              </p>
              <p className="text-xs text-muted-foreground">
                Grace: {shift.gracePeriodMinutes}m · Late: {shift.lateThresholdMinutes}m
              </p>
              <div className="flex gap-2 pt-1">
                {shift.remoteAllowed && (
                  <span className="text-xs status-remote px-2 py-0.5 rounded-full">Remote OK</span>
                )}
                {!shift.isActive && (
                  <span className="text-xs status-absent px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Holidays */}
      <GlassCard>
        <p className="text-sm font-semibold mb-4">
          Public Holidays {year} ({holidays.length})
        </p>
        <div className="space-y-1">
          {holidays.length === 0 && (
            <p className="text-sm text-muted-foreground">No holidays added yet.</p>
          )}
          {holidays.map((holiday) => (
            <div
              key={holiday._id.toString()}
              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{holiday.name}</p>
                {holiday.description && (
                  <p className="text-xs text-muted-foreground">{holiday.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm">{formatDate(holiday.date)}</p>
                {holiday.isRecurringYearly && (
                  <p className="text-xs text-muted-foreground">Recurring</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default function ShiftsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl bg-white/5" />}>
      <ShiftsData />
    </Suspense>
  );
}
