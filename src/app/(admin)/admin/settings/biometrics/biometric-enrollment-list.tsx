"use client";

import { useState } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { EnrollmentWizard } from "@/components/face/enrollment-wizard";

interface Employee {
  id: string;
  displayName: string;
  employeeCode: string;
  biometricEnrolled: boolean;
}

export function BiometricEnrollmentList({ employees }: { employees: Employee[] }) {
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  if (enrollingId) {
    return (
      <div className="max-w-md mx-auto">
        <EnrollmentWizard
          employeeId={enrollingId}
          onSuccess={() => { setEnrollingId(null); window.location.reload(); }}
          onCancel={() => setEnrollingId(null)}
        />
      </div>
    );
  }

  return (
    <GlassCard padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Employee</th>
              <th className="text-left py-3 px-4 font-medium">Biometric Status</th>
              <th className="text-right py-3 px-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-white/5 last:border-0">
                <td className="py-3 px-4">
                  <p className="font-medium">{emp.displayName}</p>
                  <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      emp.biometricEnrolled ? "status-present" : "status-weekend"
                    }`}
                  >
                    {emp.biometricEnrolled ? "Enrolled" : "Not enrolled"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEnrollingId(emp.id)}
                    className="bg-white/5 border-white/10 text-xs"
                  >
                    {emp.biometricEnrolled ? "Re-enroll" : "Enroll"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
