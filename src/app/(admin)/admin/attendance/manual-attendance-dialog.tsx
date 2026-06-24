"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addManualAttendance } from "@/actions/admin";
import { Plus } from "lucide-react";
import type { AttendanceStatus } from "@/types";

interface Props {
  employees: { id: string; displayName: string; code: string }[];
}

export function ManualAttendanceDialog({ employees }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [dateKey, setDateKey] = useState(new Date().toISOString().split("T")[0]);
  const [checkInAt, setCheckInAt] = useState("");
  const [checkOutAt, setCheckOutAt] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("PRESENT");
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !reason) {
      setError("Employee and reason are required.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await addManualAttendance({
        employeeId,
        dateKey,
        checkInAt: checkInAt ? `${dateKey}T${checkInAt}:00` : undefined,
        checkOutAt: checkOutAt ? `${dateKey}T${checkOutAt}:00` : undefined,
        status,
        reason,
      });
      if (result.success) {
        setOpen(false);
        window.location.reload();
      } else {
        setError("Failed to save attendance.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white/5 border-white/10">
          <Plus className="h-4 w-4" />
          Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Attendance Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select onValueChange={(v: string | null) => { if (v !== null) setEmployeeId(v); }} required>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.displayName} ({e.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "REMOTE", "FIELD_VISIT", "HALF_DAY", "HOLIDAY"] as AttendanceStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check In Time</Label>
              <Input
                type="time"
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check Out Time</Label>
              <Input
                type="time"
                value={checkOutAt}
                onChange={(e) => setCheckOutAt(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for manual attendance entry…"
              className="bg-white/5 border-white/10 min-h-20"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
