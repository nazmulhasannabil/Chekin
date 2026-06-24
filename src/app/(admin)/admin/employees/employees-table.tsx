"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/shared/glass-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/types";

interface Employee {
  id: string;
  employeeCode: string;
  displayName: string;
  designation?: string;
  status: EmployeeStatus;
  biometricEnrolled: boolean;
  employmentType: string;
  employmentStartDate: string;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  shift: { id: string; name: string } | null;
}

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      <GlassCard padding="sm">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-40 bg-white/5 border-white/10 h-9 text-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      <GlassCard padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Employee</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Branch / Dept</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Shift</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Biometric</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No employees found
                  </td>
                </tr>
              )}
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <Link href={`/admin/employees/${emp.id}`} className="hover:text-primary">
                      <p className="font-medium">{emp.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employeeCode}
                        {emp.designation && ` · ${emp.designation}`}
                      </p>
                    </Link>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                    <p>{emp.branch?.name ?? "—"}</p>
                    <p className="text-xs">{emp.department?.name ?? "—"}</p>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                    {emp.shift?.name ?? "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        emp.status === "ACTIVE"
                          ? "status-present"
                          : emp.status === "INACTIVE"
                          ? "status-late"
                          : "status-absent"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span
                      className={`text-xs ${
                        emp.biometricEnrolled ? "text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {emp.biometricEnrolled ? "Enrolled" : "Not enrolled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
