import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  PRESENT:          { label: "Present",         className: "status-present" },
  LATE:             { label: "Late",             className: "status-late" },
  ABSENT:           { label: "Absent",           className: "status-absent" },
  ON_LEAVE:         { label: "On Leave",         className: "status-leave" },
  REMOTE:           { label: "Remote",           className: "status-remote" },
  FIELD_VISIT:      { label: "Field Visit",      className: "status-field" },
  WEEKEND:          { label: "Weekend",          className: "status-weekend" },
  HOLIDAY:          { label: "Holiday",          className: "status-holiday" },
  HALF_DAY:         { label: "Half Day",         className: "status-leave" },
  EARLY_LEAVE:      { label: "Early Leave",      className: "status-late" },
  OVERTIME:         { label: "Overtime",         className: "status-overtime" },
  MISSING_CHECKOUT: { label: "Missing Checkout", className: "status-review" },
  PENDING_REVIEW:   { label: "Pending Review",   className: "status-review" },
  REJECTED:         { label: "Rejected",         className: "status-absent" },
};

interface StatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "status-review" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
