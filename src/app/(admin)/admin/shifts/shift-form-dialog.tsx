"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createShift } from "@/actions/shifts";
import { Plus } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  gracePeriodMinutes: z.coerce.number().min(0).default(10),
  lateThresholdMinutes: z.coerce.number().min(0).default(15),
  halfDayThresholdMinutes: z.coerce.number().min(0).default(240),
  minWorkingHours: z.coerce.number().min(0).default(8),
  breakAllowanceMinutes: z.coerce.number().min(0).default(60),
  overtimeAfterMinutes: z.coerce.number().min(0).default(480),
  earlyLeaveThresholdMinutes: z.coerce.number().min(0).default(30),
  checkInOpenMinutes: z.coerce.number().min(0).default(60),
  isOvernight: z.boolean().default(false),
  remoteAllowed: z.boolean().default(false),
  color: z.string().default("#6366f1"),
});

type FormData = z.infer<typeof schema>;

export function ShiftFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData> });

  function onSubmit(data: FormData) {
    setError("");
    startTransition(async () => {
      const result = await createShift(data);
      if (result.success) {
        setOpen(false);
        window.location.reload();
      } else {
        setError("Failed to create shift.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Shift Name</Label>
              <Input {...register("name")} placeholder="Morning Shift" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" {...register("startTime")} defaultValue="09:00" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" {...register("endTime")} defaultValue="18:00" className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Check-in Opens (min before)", field: "checkInOpenMinutes", default: 60 },
              { label: "Grace Period (min)", field: "gracePeriodMinutes", default: 10 },
              { label: "Late Threshold (min)", field: "lateThresholdMinutes", default: 15 },
              { label: "Half-Day Threshold (min)", field: "halfDayThresholdMinutes", default: 240 },
              { label: "Min Working Hours", field: "minWorkingHours", default: 8 },
              { label: "Break Allowance (min)", field: "breakAllowanceMinutes", default: 60 },
              { label: "Overtime After (min)", field: "overtimeAfterMinutes", default: 480 },
              { label: "Early Leave Threshold (min)", field: "earlyLeaveThresholdMinutes", default: 30 },
            ].map(({ label, field, default: def }) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  {...register(field as keyof FormData)}
                  defaultValue={def}
                  className="bg-white/5 border-white/10"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={watch("isOvernight") ?? false}
                onCheckedChange={(v) => setValue("isOvernight", v)}
                id="overnight"
              />
              <Label htmlFor="overnight" className="text-sm">Overnight</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={watch("remoteAllowed") ?? false}
                onCheckedChange={(v) => setValue("remoteAllowed", v)}
                id="remote"
              />
              <Label htmlFor="remote" className="text-sm">Remote Allowed</Label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
