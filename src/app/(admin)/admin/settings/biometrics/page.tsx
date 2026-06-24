import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BiometricEnrollmentList } from "./biometric-enrollment-list";

async function BiometricsData() {
  const session = await requirePermission("biometric.manage");
  await connectDB();

  const employees = await Employee.find({
    organizationId: session.organizationId,
    status: "ACTIVE",
  })
    .select("_id displayName employeeCode biometricEnrolled faceProfileId")
    .sort({ displayName: 1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biometric Enrollment</h1>
        <p className="text-sm text-muted-foreground">
          Manage face verification enrollment for employees.
        </p>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Enrollment Status</p>
          <p className="text-sm text-muted-foreground">
            {employees.filter((e) => e.biometricEnrolled).length} / {employees.length} enrolled
          </p>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${employees.length > 0 ? (employees.filter((e) => e.biometricEnrolled).length / employees.length) * 100 : 0}%`,
            }}
          />
        </div>
      </GlassCard>

      <BiometricEnrollmentList
        employees={employees.map((e) => ({
          id: e._id.toString(),
          displayName: e.displayName,
          employeeCode: e.employeeCode,
          biometricEnrolled: e.biometricEnrolled,
        }))}
      />
    </div>
  );
}

export default function BiometricsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/5" />}>
      <BiometricsData />
    </Suspense>
  );
}
