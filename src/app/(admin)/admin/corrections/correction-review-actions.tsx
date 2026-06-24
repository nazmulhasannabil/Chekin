"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewCorrectionRequest } from "@/actions/admin";
import { Check, X } from "lucide-react";

export function CorrectionReviewActions({ correctionId }: { correctionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showComment, setShowComment] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");

  function handleDecision(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewCorrectionRequest(correctionId, decision, comment);
      window.location.reload();
    });
  }

  if (showComment) {
    return (
      <div className="flex flex-col gap-2 min-w-48">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment (optional)…"
          className="bg-white/5 border-white/10 text-xs min-h-16"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleDecision(showComment)}
            disabled={isPending}
            className={showComment === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
          >
            Confirm {showComment === "APPROVED" ? "Approve" : "Reject"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowComment(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 ml-4">
      <Button
        size="sm"
        onClick={() => setShowComment("APPROVED")}
        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={() => setShowComment("REJECTED")}
        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
