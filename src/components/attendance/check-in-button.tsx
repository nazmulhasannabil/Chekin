"use client";

import { useState, useTransition } from "react";
import { generateId } from "@/lib/utils";
import { recordAttendanceEvent } from "@/actions/attendance";
import type { AttendanceEventType, WorkMode } from "@/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CheckInButtonProps {
  currentEventType: AttendanceEventType | null;
  currentStatus?: string;
  onSuccess?: (eventId: string, explanation: string) => void;
}

const EVENT_CONFIG: Record<
  AttendanceEventType,
  { label: string; nextLabel: string; className: string }
> = {
  CHECK_IN: {
    label: "Check In",
    nextLabel: "CHECK_OUT",
    className: "checkin-btn text-white w-full",
  },
  CHECK_OUT: {
    label: "Check Out",
    nextLabel: "CHECK_IN",
    className: "checkout-btn text-white w-full",
  },
  BREAK_START: {
    label: "Start Break",
    nextLabel: "BREAK_END",
    className:
      "w-full min-h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500/30 transition-all",
  },
  BREAK_END: {
    label: "End Break",
    nextLabel: "CHECK_OUT",
    className:
      "w-full min-h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 font-semibold hover:bg-sky-500/30 transition-all",
  },
};

function getNextEventType(current: AttendanceEventType | null): AttendanceEventType {
  if (!current) return "CHECK_IN";
  const map: Record<AttendanceEventType, AttendanceEventType> = {
    CHECK_IN: "CHECK_OUT",
    CHECK_OUT: "CHECK_IN",
    BREAK_START: "BREAK_END",
    BREAK_END: "CHECK_OUT",
  };
  return map[current];
}

export function CheckInButton({ currentEventType, onSuccess }: CheckInButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>("OFFICE");

  const nextType = getNextEventType(currentEventType);
  const config = EVENT_CONFIG[nextType];

  function handleClick() {
    setFeedback(null);

    startTransition(async () => {
      const idempotencyKey = generateId();

      let location: { latitude: number; longitude: number; accuracyMeters: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        };
      } catch {
        // Location is optional
      }

      const result = await recordAttendanceEvent({
        type: nextType,
        workMode,
        idempotencyKey,
        location,
      });

      if (result.success) {
        setFeedback({ type: "success", message: result.statusExplanation ?? "Recorded successfully." });
        onSuccess?.(result.eventId!, result.statusExplanation ?? "");
      } else {
        setFeedback({ type: "error", message: result.error ?? "Failed to record." });
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Work mode selector */}
      {nextType === "CHECK_IN" && (
        <div className="grid grid-cols-2 gap-2">
          {(["OFFICE", "REMOTE", "FIELD_VISIT", "CLIENT_SITE"] as WorkMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setWorkMode(mode)}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                workMode === mode
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
              )}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(config.className, "flex items-center justify-center gap-2")}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Recording…
          </>
        ) : (
          config.label
        )}
      </button>

      {feedback && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm border",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
