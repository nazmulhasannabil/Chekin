"use client";

import type { AttendanceStatus } from "@/types";

interface DaySummary {
  dateKey: string;
  status: AttendanceStatus;
  workedMinutes: number;
  lateMinutes: number;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500",
  LATE: "bg-amber-500",
  ABSENT: "bg-red-500/60",
  ON_LEAVE: "bg-sky-500",
  REMOTE: "bg-violet-500",
  FIELD_VISIT: "bg-orange-500",
  WEEKEND: "bg-slate-600",
  HOLIDAY: "bg-rose-500",
  HALF_DAY: "bg-sky-400",
  EARLY_LEAVE: "bg-amber-400",
  OVERTIME: "bg-indigo-500",
  MISSING_CHECKOUT: "bg-yellow-600",
  PENDING_REVIEW: "bg-yellow-500",
  REJECTED: "bg-red-700",
};

export function PerformanceCharts({ days }: { days: DaySummary[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const dayMap = new Map(days.map((d) => [d.dateKey, d]));

  const cells: (DaySummary | null | "empty")[] = [
    ...Array.from({ length: firstDayOfWeek }, () => "empty" as const),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return dayMap.get(dateKey) ?? null;
    }),
  ];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell === "empty") {
            return <div key={i} />;
          }

          const dayNum = i - firstDayOfWeek + 1;
          const isToday =
            dayNum === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          if (!cell) {
            return (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-xs text-muted-foreground ${
                  isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                }`}
              >
                {dayNum}
              </div>
            );
          }

          const colorClass = STATUS_COLORS[cell.status] ?? "bg-slate-600";

          return (
            <div
              key={i}
              title={`${cell.dateKey}: ${cell.status}`}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium text-white ${colorClass} ${
                isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
              } cursor-default transition-opacity hover:opacity-80`}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {([
          ["Present", "bg-emerald-500"],
          ["Late", "bg-amber-500"],
          ["Absent", "bg-red-500/60"],
          ["Remote", "bg-violet-500"],
          ["Leave", "bg-sky-500"],
        ] as [string, string][]).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-sm ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
