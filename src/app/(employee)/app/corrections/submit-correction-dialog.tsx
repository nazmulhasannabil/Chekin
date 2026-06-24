"use client";

import { useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { submitCorrectionRequest } from "@/actions/corrections";
import { Plus } from "lucide-react";
import type { AttendanceStatus } from "@/types";

interface RecentDay {
  id: string;
  dateKey: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
}

export function SubmitCorrectionDialog({ recentDays }: { recentDays: RecentDay[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedDayId, setSelectedDayId] = useState("");
  const [reason, setReason] = useState("");
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [error, setError] = useState("");

  const selectedDay = recentDays.find((d) => d.id === selectedDayId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setError("");
    startTransition(async () => {
      const result = await submitCorrectionRequest({
        attendanceDayId: selectedDayId || undefined,
        reason,
        requestedCheckIn: selectedDay && requestedCheckIn
          ? `${selectedDay.dateKey}T${requestedCheckIn}:00`
          : undefined,
        requestedCheckOut: selectedDay && requestedCheckOut
          ? `${selectedDay.dateKey}T${requestedCheckOut}:00`
          : undefined,
        originalCheckIn: selectedDay?.checkInAt,
        originalCheckOut: selectedDay?.checkOutAt,
      });
      if (result.success) {
        setOpen(false);
        window.location.reload();
      } else {
        setError(result.error ?? "Failed to submit correction.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="h-4 w-4" />
        New Request
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Correction Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Date (optional)</Label>
            <Select onValueChange={(v: string | null) => { if (v !== null) setSelectedDayId(v); }}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select a date…" />
              </SelectTrigger>
              <SelectContent>
                {recentDays.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.dateKey} — {d.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Corrected Check-in</Label>
                <Input
                  type="time"
                  value={requestedCheckIn}
                  onChange={(e) => setRequestedCheckIn(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corrected Check-out</Label>
                <Input
                  type="time"
                  value={requestedCheckOut}
                  onChange={(e) => setRequestedCheckOut(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the correction needed…"
              className="bg-white/5 border-white/10 min-h-20"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
