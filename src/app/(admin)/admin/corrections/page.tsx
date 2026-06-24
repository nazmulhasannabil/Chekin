import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { CorrectionRequest } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime } from "@/lib/utils";
import { CorrectionReviewActions } from "./correction-review-actions";
import type { CorrectionStatus } from "@/types";

async function CorrectionsAdminData() {
  const session = await requirePermission("correction.approve");
  await connectDB();

  const corrections = await CorrectionRequest.find({
    organizationId: session.organizationId,
    status: "PENDING",
  })
    .populate("employeeId", "displayName employeeCode")
    .sort({ createdAt: 1 })
    .lean();

  const resolved = await CorrectionRequest.find({
    organizationId: session.organizationId,
    status: { $in: ["APPROVED", "REJECTED"] },
  })
    .populate("employeeId", "displayName employeeCode")
    .sort({ reviewedAt: -1 })
    .limit(20)
    .lean();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Correction Requests</h1>

      {/* Pending */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          PENDING ({corrections.length})
        </h2>
        {corrections.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending corrections.</p>
        )}
        <div className="space-y-3">
          {corrections.map((c) => {
            const emp = c.employeeId as Record<string, unknown>;
            return (
              <GlassCard key={c._id.toString()}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{emp?.displayName as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp?.employeeCode as string} · {formatDate(c.createdAt)}
                    </p>
                    <p className="text-sm mt-2 text-foreground/80">{c.reason}</p>

                    {(c.requestedCheckIn || c.requestedCheckOut) && (
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        {c.originalCheckIn && (
                          <span>
                            Was: {formatTime(c.originalCheckIn)}
                            {c.originalCheckOut && ` – ${formatTime(c.originalCheckOut)}`}
                          </span>
                        )}
                        {c.requestedCheckIn && (
                          <span className="text-primary">
                            →{" "}
                            {formatTime(c.requestedCheckIn)}
                            {c.requestedCheckOut && ` – ${formatTime(c.requestedCheckOut)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <CorrectionReviewActions correctionId={c._id.toString()} />
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            RECENTLY RESOLVED
          </h2>
          <GlassCard padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Reason</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map((c) => {
                    const emp = c.employeeId as Record<string, unknown>;
                    return (
                      <tr key={c._id.toString()} className="border-b border-white/5 last:border-0">
                        <td className="py-3 px-4 font-medium">{emp?.displayName as string}</td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                          {c.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              c.status === "APPROVED" ? "status-present" : "status-absent"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                          {c.reviewedAt ? formatDate(c.reviewedAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default function CorrectionsAdminPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
      <CorrectionsAdminData />
    </Suspense>
  );
}
