import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import { getExportJobs } from "@/actions/reports";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { ExportRequestForm } from "./export-request-form";
import { Download, FileSpreadsheet } from "lucide-react";

async function ExportsData() {
  await requirePermission("attendance.export");
  const jobs = await getExportJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
      </div>

      <ExportRequestForm />

      <GlassCard>
        <p className="text-sm font-semibold mb-4">Export History</p>
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">No exports yet.</p>
        )}
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {job.type} · {job.format}
                    {job.recordCount && (
                      <span className="text-muted-foreground ml-1">({job.recordCount} rows)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By {job.requestedBy} · {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    job.status === "COMPLETED"
                      ? "status-present"
                      : job.status === "FAILED"
                      ? "status-absent"
                      : job.status === "PROCESSING"
                      ? "status-review"
                      : "status-weekend"
                  }`}
                >
                  {job.status}
                </span>
                {job.status === "COMPLETED" && job.signedUrl && (
                  <a
                    href={job.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
      <ExportsData />
    </Suspense>
  );
}
