"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTime } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  displayName: string;
  employeeCode: string;
  designation?: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes: number;
  workMode?: string;
}

interface LiveBoardClientProps {
  initialRecords: AttendanceRecord[];
  totalEmployees: number;
  branches: { id: string; name: string; code: string }[];
  departments: { id: string; name: string; code: string }[];
}

export function LiveBoardClient({
  initialRecords,
  totalEmployees,
  branches,
  departments,
}: LiveBoardClientProps) {
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLive, setIsLive] = useState(false);

  // SSE connection for live updates
  useEffect(() => {
    const es = new EventSource("/api/change-stream");
    es.onopen = () => setIsLive(true);
    es.onerror = () => setIsLive(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "attendance_update") {
          // Refresh the page data on any attendance change
          window.location.reload();
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  const filtered = records.filter((r) => {
    const matchesSearch =
      !search ||
      r.displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const checkedIn = records.filter((r) =>
    ["PRESENT", "LATE", "OVERTIME", "REMOTE", "FIELD_VISIT"].includes(r.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Live indicator + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`}
          />
          <span className="text-sm text-muted-foreground">
            {isLive ? "Live" : "Connecting…"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {checkedIn} / {totalEmployees} checked in
        </p>
      </div>

      {/* Filters */}
      <GlassCard padding="sm">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-40 bg-white/5 border-white/10 h-9 text-sm"
          />
          <Select value={statusFilter} onValueChange={(v: string | null) => { if (v !== null) setStatusFilter(v); }}>
            <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PRESENT">Present</SelectItem>
              <SelectItem value="LATE">Late</SelectItem>
              <SelectItem value="ABSENT">Absent</SelectItem>
              <SelectItem value="REMOTE">Remote</SelectItem>
              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              <SelectItem value="MISSING_CHECKOUT">Missing Checkout</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Records table */}
      <GlassCard padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Employee</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Check In</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Check Out</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Mode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{record.displayName}</p>
                      <p className="text-xs text-muted-foreground">{record.employeeCode}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={record.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                    {record.checkInAt ? formatTime(record.checkInAt) : "—"}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                    {record.checkOutAt ? formatTime(record.checkOutAt) : "—"}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {record.workMode && (
                      <span className="text-xs text-muted-foreground">
                        {record.workMode.replace("_", " ")}
                      </span>
                    )}
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
