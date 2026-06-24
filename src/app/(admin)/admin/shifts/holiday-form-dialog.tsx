"use client";

import { useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createHoliday } from "@/actions/shifts";
import { CalendarPlus } from "lucide-react";

export function HolidayFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !date) { setError("Name and date are required."); return; }
    setError("");
    startTransition(async () => {
      const result = await createHoliday({ name, date, description, isRecurringYearly: recurring });
      if (result.success) {
        setOpen(false);
        window.location.reload();
      } else {
        setError("Failed to create holiday.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-white/5 border-white/10" />}>
        <CalendarPlus className="h-4 w-4" />
        Add Holiday
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Holiday</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Holiday Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid-ul-Fitr" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-16" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
            <Label htmlFor="recurring" className="text-sm">Recurring every year</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
