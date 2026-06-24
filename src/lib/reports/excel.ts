import ExcelJS from "exceljs";
import type { AttendanceStatus } from "@/types";

export interface AttendanceReportRow {
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  date: string;
  shift: string;
  scheduledStart: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  workMode: string;
  verificationMethod: string;
  correctionStatus: string;
  hrComment: string;
}

export interface EmployeeSummaryRow {
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  attendancePct: number;
  avgArrivalTime: string;
}

export async function generateAttendanceExcel(
  rows: AttendanceReportRow[],
  summaryRows: EmployeeSummaryRow[],
  period: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chekin";
  wb.created = new Date();

  // ── Sheet 1: Attendance Details ───────────────────────────────────────────
  const s1 = wb.addWorksheet("Attendance Details");
  s1.columns = [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Employee Name", key: "employeeName", width: 24 },
    { header: "Department", key: "department", width: 18 },
    { header: "Branch", key: "branch", width: 16 },
    { header: "Date", key: "date", width: 12 },
    { header: "Shift", key: "shift", width: 16 },
    { header: "Scheduled Start", key: "scheduledStart", width: 16 },
    { header: "Check In", key: "checkIn", width: 12 },
    { header: "Check Out", key: "checkOut", width: 12 },
    { header: "Worked Hours", key: "workedHours", width: 14 },
    { header: "Late Minutes", key: "lateMinutes", width: 14 },
    { header: "Early Leave Min", key: "earlyLeaveMinutes", width: 16 },
    { header: "Overtime Min", key: "overtimeMinutes", width: 14 },
    { header: "Attendance Status", key: "status", width: 18 },
    { header: "Work Mode", key: "workMode", width: 14 },
    { header: "Verification Method", key: "verificationMethod", width: 20 },
    { header: "Correction Status", key: "correctionStatus", width: 18 },
    { header: "HR Comment", key: "hrComment", width: 30 },
  ];

  styleHeaderRow(s1.getRow(1));
  rows.forEach((r) => s1.addRow(r));
  applyStatusColors(s1, rows);

  // ── Sheet 2: Employee Summary ─────────────────────────────────────────────
  const s2 = wb.addWorksheet("Employee Summary");
  s2.columns = [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Employee Name", key: "employeeName", width: 24 },
    { header: "Department", key: "department", width: 18 },
    { header: "Branch", key: "branch", width: 16 },
    { header: "Total Days", key: "totalDays", width: 12 },
    { header: "Present", key: "presentDays", width: 10 },
    { header: "Absent", key: "absentDays", width: 10 },
    { header: "Leave", key: "leaveDays", width: 10 },
    { header: "Late Days", key: "lateDays", width: 12 },
    { header: "Total Late Min", key: "totalLateMinutes", width: 16 },
    { header: "Overtime Min", key: "totalOvertimeMinutes", width: 14 },
    { header: "Attendance %", key: "attendancePct", width: 14 },
    { header: "Avg Arrival", key: "avgArrivalTime", width: 14 },
  ];
  styleHeaderRow(s2.getRow(1));
  summaryRows.forEach((r) => s2.addRow(r));

  // ── Sheet 3: Department Summary ───────────────────────────────────────────
  const deptMap = new Map<string, { present: number; absent: number; late: number; total: number }>();
  for (const r of rows) {
    if (!deptMap.has(r.department)) deptMap.set(r.department, { present: 0, absent: 0, late: 0, total: 0 });
    const d = deptMap.get(r.department)!;
    d.total++;
    if (["PRESENT", "LATE", "OVERTIME"].includes(r.status)) d.present++;
    if (r.status === "ABSENT") d.absent++;
    if (r.status === "LATE") d.late++;
  }
  const s3 = wb.addWorksheet("Department Summary");
  s3.columns = [
    { header: "Department", key: "department", width: 24 },
    { header: "Total Records", key: "total", width: 14 },
    { header: "Present", key: "present", width: 12 },
    { header: "Absent", key: "absent", width: 12 },
    { header: "Late", key: "late", width: 12 },
    { header: "Attendance %", key: "pct", width: 14 },
  ];
  styleHeaderRow(s3.getRow(1));
  deptMap.forEach((v, dept) => {
    s3.addRow({
      department: dept,
      ...v,
      pct: v.total > 0 ? `${Math.round((v.present / v.total) * 100)}%` : "0%",
    });
  });

  // ── Sheet 4: Late Arrivals ────────────────────────────────────────────────
  const s4 = wb.addWorksheet("Late Arrivals");
  s4.columns = [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Employee Name", key: "employeeName", width: 24 },
    { header: "Department", key: "department", width: 18 },
    { header: "Date", key: "date", width: 12 },
    { header: "Check In", key: "checkIn", width: 12 },
    { header: "Late Minutes", key: "lateMinutes", width: 14 },
    { header: "Shift", key: "shift", width: 16 },
  ];
  styleHeaderRow(s4.getRow(1));
  rows
    .filter((r) => r.lateMinutes > 0)
    .forEach((r) => s4.addRow(r));

  // ── Sheet 5: Missing Checkouts ────────────────────────────────────────────
  const s5 = wb.addWorksheet("Missing Checkouts");
  s5.columns = [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Employee Name", key: "employeeName", width: 24 },
    { header: "Date", key: "date", width: 12 },
    { header: "Check In", key: "checkIn", width: 12 },
    { header: "Status", key: "status", width: 18 },
  ];
  styleHeaderRow(s5.getRow(1));
  rows
    .filter((r) => r.status === "MISSING_CHECKOUT")
    .forEach((r) => s5.addRow(r));

  // ── Sheet 6: Manual Adjustments ───────────────────────────────────────────
  const s6 = wb.addWorksheet("Manual Adjustments");
  s6.columns = [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Employee Name", key: "employeeName", width: 24 },
    { header: "Date", key: "date", width: 12 },
    { header: "Status", key: "status", width: 18 },
    { header: "Correction Status", key: "correctionStatus", width: 18 },
    { header: "HR Comment", key: "hrComment", width: 40 },
  ];
  styleHeaderRow(s6.getRow(1));
  rows
    .filter((r) => r.correctionStatus !== "")
    .forEach((r) => s6.addRow(r));

  // ── Sheet 7: Export Information ───────────────────────────────────────────
  const s7 = wb.addWorksheet("Export Information");
  s7.getCell("A1").value = "Chekin Attendance Export";
  s7.getCell("A1").font = { bold: true, size: 14 };
  s7.getCell("A3").value = "Period:";
  s7.getCell("B3").value = period;
  s7.getCell("A4").value = "Generated:";
  s7.getCell("B4").value = new Date().toLocaleString("en-US");
  s7.getCell("A5").value = "Total Records:";
  s7.getCell("B5").value = rows.length;
  s7.getCell("A6").value = "Employees:";
  s7.getCell("B6").value = summaryRows.length;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3730A3" } };
  row.height = 20;
}

function applyStatusColors(sheet: ExcelJS.Worksheet, rows: AttendanceReportRow[]) {
  const STATUS_COLORS: Partial<Record<AttendanceStatus, string>> = {
    PRESENT: "FFD1FAE5",
    LATE: "FFFEF3C7",
    ABSENT: "FFFEE2E2",
    ON_LEAVE: "FFE0F2FE",
    REMOTE: "FFEDE9FE",
    MISSING_CHECKOUT: "FFFFF7ED",
  };

  rows.forEach((r, i) => {
    const color = STATUS_COLORS[r.status];
    if (color) {
      const row = sheet.getRow(i + 2);
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    }
  });
}
