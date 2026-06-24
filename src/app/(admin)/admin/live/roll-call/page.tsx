import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { AttendanceEvent, Branch, Employee } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/utils";

async function RollCallData() {
  const session = await requirePermission("attendance.read.all");
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orgId = session.organizationId;

  // Find all check-ins today without matching check-outs
  const checkIns = await AttendanceEvent.find({
    organizationId: orgId,
    type: "CHECK_IN",
    status: "ACCEPTED",
    recordedAt: { $gte: today },
  })
    .populate("employeeId", "displayName employeeCode branch")
    .lean();

  const checkOutEmployees = new Set(
    (
      await AttendanceEvent.find({
        organizationId: orgId,
        type: "CHECK_OUT",
        recordedAt: { $gte: today },
      })
        .select("employeeId")
        .lean()
    ).map((e) => e.employeeId.toString())
  );

  const currentlyInside = checkIns.filter(
    (e) => !checkOutEmployees.has(e.employeeId.toString())
  );

  const branches = await Branch.find({ organizationId: orgId, isActive: true })
    .select("name")
    .lean();

  // Group by branch
  const branchGroups = new Map<string, typeof currentlyInside>();
  for (const event of currentlyInside) {
    const emp = event.employeeId as Record<string, unknown>;
    const branchId = (emp?.branch as string) ?? "unknown";
    if (!branchGroups.has(branchId)) branchGroups.set(branchId, []);
    branchGroups.get(branchId)!.push(event);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emergency Roll Call</h1>
        <p className="text-sm text-muted-foreground">
          {currentlyInside.length} employees currently inside — based on today&apos;s check-ins without checkout
        </p>
      </div>

      {currentlyInside.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-muted-foreground">No employees currently recorded as inside.</p>
        </GlassCard>
      )}

      {Array.from(branchGroups.entries()).map(([branchId, events]) => {
        const branch = branches.find((b) => b._id.toString() === branchId);
        return (
          <GlassCard key={branchId}>
            <p className="text-sm font-semibold mb-3">
              {branch?.name ?? "Unknown Branch"} ({events.length})
            </p>
            <div className="space-y-2">
              {events.map((event) => {
                const emp = event.employeeId as Record<string, unknown>;
                return (
                  <div
                    key={event._id.toString()}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{emp?.displayName as string}</p>
                      <p className="text-xs text-muted-foreground">{emp?.employeeCode as string}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Checked in</p>
                      <p className="text-sm">{formatTime(event.recordedAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

export default function RollCallPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
      <RollCallData />
    </Suspense>
  );
}
