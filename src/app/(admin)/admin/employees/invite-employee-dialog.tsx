"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteEmployee } from "@/actions/employee";
import { Plus } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  employeeCode: z.string().min(1),
  designation: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  shiftId: z.string().optional(),
  employmentStartDate: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface Props {
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
}

export function InviteEmployeeDialog({ branches, departments, shifts }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    setError("");
    startTransition(async () => {
      const result = await inviteEmployee({
        ...data,
        employmentStartDate: data.employmentStartDate,
      });
      if (result.success) {
        setOpen(false);
        reset();
        window.location.reload();
      } else {
        setError(result.error ?? "Failed to invite employee.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Invite Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input {...register("firstName")} className="bg-white/5 border-white/10" />
              {errors.firstName && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input {...register("lastName")} className="bg-white/5 border-white/10" />
              {errors.lastName && <p className="text-xs text-destructive">Required</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input {...register("email")} type="email" className="bg-white/5 border-white/10" />
            {errors.email && <p className="text-xs text-destructive">Valid email required</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input {...register("employeeCode")} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input {...register("designation")} className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select onValueChange={(v: string | null) => setValue("branchId", v ?? undefined)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select onValueChange={(v: string | null) => setValue("departmentId", v ?? undefined)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select dept" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select onValueChange={(v: string | null) => setValue("shiftId", v ?? undefined)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                {...register("employmentStartDate")}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Inviting…" : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
