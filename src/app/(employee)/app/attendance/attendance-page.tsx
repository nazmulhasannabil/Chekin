"use client";

import { useState } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { CheckInButton } from "@/components/attendance/check-in-button";
import { StatusBadge } from "@/components/attendance/status-badge";
import { formatTime, formatMinutes } from "@/lib/utils";
import type { AttendanceStatus, AttendanceEventType } from "@/types";
import { Clock, MapPin, Wifi } from "lucide-react";

interface AttendancePageProps {
  employee: {
    id: string;
    displayName: string;
    designation?: string;
    profileImageUrl?: string;
  };
  todayRecord: {
    status: AttendanceStatus;
    checkInAt?: string;
    checkOutAt?: string;
    workedMinutes: number;
    lateMinutes: number;
    statusExplanation?: string;
  } | null;
  recentEvents: {
    id: string;
    type: AttendanceEventType;
    recordedAt: string;
    status: string;
    workMode?: string;
    source: string;
  }[];
  stats: {
    presentDays: number;
    attendancePct: number;
  };
}

export function AttendancePage({
  employee,
  todayRecord,
  recentEvents,
  stats,
}: AttendancePageProps) {
  const [localRecord, setLocalRecord] = useState(todayRecord);
  const [localEvents, setLocalEvents] = useState(recentEvents);

  const lastEventType =
    recentEvents[0]?.type as AttendanceEventType | null ?? null;

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">
          Good {getGreeting()}, {employee.displayName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Live clock */}
      <GlassCard className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono">{currentTime}</p>
          <p className="text-xs text-muted-foreground">Server time (authoritative)</p>
        </div>
      </GlassCard>

      {/* Today's status */}
      {localRecord && (
        <GlassCard>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today&apos;s Status</p>
              <StatusBadge status={localRecord.status} />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Worked</p>
              <p className="text-lg font-semibold">{formatMinutes(localRecord.workedMinutes)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Check In</p>
              <p className="font-medium">
                {localRecord.checkInAt ? formatTime(localRecord.checkInAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check Out</p>
              <p className="font-medium">
                {localRecord.checkOutAt ? formatTime(localRecord.checkOutAt) : "—"}
              </p>
            </div>
          </div>

          {localRecord.lateMinutes > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              Late by {formatMinutes(localRecord.lateMinutes)}
            </p>
          )}

          {localRecord.statusExplanation && (
            <p className="mt-3 text-xs text-muted-foreground bg-white/5 rounded-xl px-3 py-2">
              {localRecord.statusExplanation}
            </p>
          )}
        </GlassCard>
      )}

      {/* Check in / out button */}
      <GlassCard>
        <p className="text-sm font-medium mb-3">Record Attendance</p>
        <CheckInButton
          currentEventType={lastEventType}
          onSuccess={() => {
            // Refresh by router.refresh() would work here — handled by page reload
            window.location.reload();
          }}
        />
      </GlassCard>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard padding="sm" className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.presentDays}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Present (30d)</p>
        </GlassCard>
        <GlassCard padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.attendancePct}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Attendance</p>
        </GlassCard>
      </div>

      {/* Recent activity */}
      {localEvents.length > 0 && (
        <GlassCard>
          <p className="text-sm font-medium mb-3">Recent Activity</p>
          <div className="space-y-2">
            {localEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      event.type === "CHECK_IN"
                        ? "bg-emerald-400"
                        : event.type === "CHECK_OUT"
                        ? "bg-red-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="text-foreground">
                    {event.type.replace("_", " ")}
                  </span>
                  {event.workMode && (
                    <span className="text-xs text-muted-foreground">
                      · {event.workMode.replace("_", " ")}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatTime(event.recordedAt)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
