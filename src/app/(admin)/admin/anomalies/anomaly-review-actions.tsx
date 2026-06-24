"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function AnomalyReviewActions({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDecision(decision: "ACCEPTED" | "REJECTED") {
    startTransition(async () => {
      const response = await fetch(`/api/attendance/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status: decision }),
      });
      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => handleDecision("ACCEPTED")}
        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs gap-1"
      >
        <Check className="h-3.5 w-3.5" />
        Accept
      </Button>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => handleDecision("REJECTED")}
        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs gap-1"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </Button>
    </div>
  );
}
