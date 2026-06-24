"use server";

import connectDB from "@/lib/db/connection";
import { AttendanceDay, AttendanceEvent, Employee, ExportJob } from "@/lib/db/models";
import { requirePermission } from "@/lib/auth/permissions";
import type { AttendanceStatus } from "@/types";

export interface ReportFilters {
  startDate: string;
  endDate: string;
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
  format?: "XLSX" | "CSV";
}

export async function createExportJob(filters: ReportFilters) {
  const session = await requirePermission("attendance.export");
  await connectDB();

  const job = await ExportJob.create({
    organizationId: session.organizationId,
    requestedBy: session.userId,
    type: "ATTENDANCE",
    format: filters.format ?? "XLSX",
    filters: { ...filters } as Record<string, unknown>,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Trigger background processing — in production, use a queue like BullMQ
  // For now, process inline (acceptable for smaller datasets)
  processExportJob(job._id.toString(), session.organizationId, filters).catch(console.error);

  return { success: true, jobId: job._id.toString() };
}

async function processExportJob(
  jobId: string,
  organizationId: string,
  filters: ReportFilters
) {
  await ExportJob.updateOne({ _id: jobId }, { status: "PROCESSING", startedAt: new Date() });

  try {
    const query: Record<string, unknown> = {
      organizationId,
      dateKey: { $gte: filters.startDate, $lte: filters.endDate },
    };
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.employeeId) query.employeeId = filters.employeeId;

    const days = await AttendanceDay.find(query)
      .populate("employeeId", "displayName employeeCode")
      .populate("branchId", "name")
      .populate("departmentId", "name")
      .populate("shiftId", "name startTime")
      .populate("adjustedBy", "name")
      .lean();

    const { generateAttendanceExcel } = await import("@/lib/reports/excel");
    const { uploadBuffer, getPresignedUrl } = await import("@/lib/s3/client");

    const rows = days.map((day) => {
      const emp = day.employeeId as unknown as Record<string, unknown>;
      const branch = day.branchId as unknown as Record<string, unknown> | null;
      const dept = day.departmentId as unknown as Record<string, unknown> | null;
      const shift = day.shiftId as unknown as Record<string, unknown> | null;

      return {
        employeeId: emp?.employeeCode as string ?? "",
        employeeName: emp?.displayName as string ?? "",
        department: dept?.name as string ?? "",
        branch: branch?.name as string ?? "",
        date: day.dateKey,
        shift: shift?.name as string ?? "",
        scheduledStart: shift?.startTime as string ?? "",
        checkIn: day.checkInAt?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) ?? "",
        checkOut: day.checkOutAt?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) ?? "",
        workedHours: Math.round((day.workedMinutes / 60) * 100) / 100,
        lateMinutes: day.lateMinutes,
        earlyLeaveMinutes: day.earlyLeaveMinutes,
        overtimeMinutes: day.overtimeMinutes,
        status: day.status as AttendanceStatus,
        workMode: "OFFICE",
        verificationMethod: "PASSKEY",
        correctionStatus: day.manuallyAdjusted ? "ADJUSTED" : "",
        hrComment: day.hrComment ?? "",
      };
    });

    // Build summary per employee
    const empMap = new Map<string, typeof rows[0][]>();
    for (const r of rows) {
      if (!empMap.has(r.employeeId)) empMap.set(r.employeeId, []);
      empMap.get(r.employeeId)!.push(r);
    }

    const summaryRows = Array.from(empMap.entries()).map(([empId, empRows]) => {
      const present = empRows.filter((r) => ["PRESENT", "LATE", "OVERTIME"].includes(r.status)).length;
      const absent = empRows.filter((r) => r.status === "ABSENT").length;
      const leave = empRows.filter((r) => r.status === "ON_LEAVE").length;
      const late = empRows.filter((r) => r.status === "LATE").length;
      const workDays = empRows.filter((r) => !["WEEKEND", "HOLIDAY"].includes(r.status)).length;

      return {
        employeeId: empId,
        employeeName: empRows[0].employeeName,
        department: empRows[0].department,
        branch: empRows[0].branch,
        totalDays: empRows.length,
        presentDays: present,
        absentDays: absent,
        leaveDays: leave,
        lateDays: late,
        totalLateMinutes: empRows.reduce((s, r) => s + r.lateMinutes, 0),
        totalOvertimeMinutes: empRows.reduce((s, r) => s + r.overtimeMinutes, 0),
        attendancePct: workDays > 0 ? Math.round((present / workDays) * 100) : 0,
        avgArrivalTime: "—",
      };
    });

    const period = `${filters.startDate} to ${filters.endDate}`;
    const buffer = await generateAttendanceExcel(rows, summaryRows, period);

    const s3Key = `exports/${organizationId}/${jobId}.xlsx`;
    await uploadBuffer(s3Key, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const signedUrl = await getPresignedUrl(s3Key, 86400);

    await ExportJob.updateOne(
      { _id: jobId },
      {
        status: "COMPLETED",
        s3Key,
        signedUrl,
        signedUrlExpiresAt: new Date(Date.now() + 86400000),
        completedAt: new Date(),
        recordCount: rows.length,
      }
    );
  } catch (err) {
    await ExportJob.updateOne(
      { _id: jobId },
      { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Unknown error" }
    );
  }
}

export async function getExportJobs() {
  const session = await requirePermission("attendance.export");
  await connectDB();

  const jobs = await ExportJob.find({ organizationId: session.organizationId })
    .populate("requestedBy", "name")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return jobs.map((j) => ({
    id: j._id.toString(),
    type: j.type,
    format: j.format,
    status: j.status,
    signedUrl: j.signedUrl,
    recordCount: j.recordCount,
    errorMessage: j.errorMessage,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString(),
    requestedBy: (j.requestedBy as Record<string, unknown>)?.name as string ?? "Unknown",
  }));
}
