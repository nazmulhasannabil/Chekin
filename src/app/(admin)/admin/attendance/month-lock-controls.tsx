"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { lockMonth, unlockMonth } from "@/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, Unlock } from "lucide-react";

export function MonthLockControls({ dateKey }: { dateKey: string }) {
  const [isPending, startTransition] = useTransition();
  const [unlockReason, setUnlockReason] = useState("");

  const date = new Date(dateKey + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function handleLock() {
    startTransition(async () => {
      await lockMonth(year, month);
      window.location.reload();
    });
  }

  function handleUnlock() {
    if (!unlockReason.trim()) return;
    startTransition(async () => {
      await unlockMonth(year, month, unlockReason);
      window.location.reload();
    });
  }

  return (
    <div className="flex gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-white/5 border-white/10">
            <Lock className="h-3.5 w-3.5" />
            Lock Month
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Lock {monthLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock all attendance records for {monthLabel}. Locked records cannot be edited without elevated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} disabled={isPending}>
              {isPending ? "Locking…" : "Lock Month"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-white/5 border-white/10 text-amber-400 border-amber-500/30">
            <Unlock className="h-3.5 w-3.5" />
            Unlock
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {monthLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a mandatory reason for unlocking this finalized month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="Reason for unlocking…"
            className="bg-white/5 border-white/10 mx-6 mb-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlock}
              disabled={isPending || !unlockReason.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isPending ? "Unlocking…" : "Unlock Month"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
