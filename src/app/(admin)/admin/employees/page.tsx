import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee, Branch, Department, Shift } from "@/lib/db/models";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeesTable } from "./employees-table";
import { InviteEmployeeDialog } from "./invite-employee-dialog";
import type { EmployeeStatus } from "@/types";

async function EmployeesData() {
  const session = await requirePermission("employee.read");
  await connectDB();

  const [employees, branches, departments, shifts] = await Promise.all([
    Employee.find({ organizationId: session.organizationId })
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("shiftId", "name")
      .sort({ displayName: 1 })
      .lean(),
    Branch.find({ organizationId: session.organizationId, isActive: true })
      .select("name code")
      .lean(),
    Department.find({ organizationId: session.organizationId, isActive: true })
      .select("name code")
      .lean(),
    Shift.find({ organizationId: session.organizationId, isActive: true })
      .select("name")
      .lean(),
  ]);

  const serialized = employees.map((e) => {
    const branch = e.branch as Record<string, unknown> | null;
    const dept = e.department as Record<string, unknown> | null;
    const shift = e.shiftId as Record<string, unknown> | null;
    return {
      id: e._id.toString(),
      employeeCode: e.employeeCode,
      displayName: e.displayName,
      designation: e.designation ?? "",
      status: e.status as EmployeeStatus,
      biometricEnrolled: e.biometricEnrolled,
      employmentType: e.employmentType,
      employmentStartDate: e.employmentStartDate.toISOString(),
      branch: branch ? { id: branch._id?.toString() ?? "", name: branch.name as string } : null,
      department: dept ? { id: dept._id?.toString() ?? "", name: dept.name as string } : null,
      shift: shift ? { id: shift._id?.toString() ?? "", name: shift.name as string } : null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total</p>
        </div>
        <InviteEmployeeDialog
          branches={branches.map((b) => ({ id: b._id.toString(), name: b.name }))}
          departments={departments.map((d) => ({ id: d._id.toString(), name: d.name }))}
          shifts={shifts.map((s) => ({ id: s._id.toString(), name: s.name }))}
        />
      </div>

      <EmployeesTable employees={serialized} />
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-32 bg-white/5" />
            <Skeleton className="h-10 w-32 bg-white/5" />
          </div>
          <Skeleton className="h-96 rounded-3xl bg-white/5" />
        </div>
      }
    >
      <EmployeesData />
    </Suspense>
  );
}
