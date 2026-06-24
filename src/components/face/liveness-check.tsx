"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LivenessAction } from "@/lib/redis/attendance-challenge";

interface LivenessCheckProps {
  challengeId: string;
  requiredAction: LivenessAction;
  onComplete: (result: {
    challengeId: string;
    imageBase64: string;
    livenessCompleted: boolean;
  }) => void;
  onCancel: () => void;
}

const ACTION_INSTRUCTIONS: Record<LivenessAction, string> = {
  BLINK: "Please blink twice",
  TURN_LEFT: "Slowly turn your head to the left",
  TURN_RIGHT: "Slowly turn your head to the right",
  NOD: "Gently nod your head",
  SMILE: "Please smile naturally",
};

export function LivenessCheck({
  challengeId,
  requiredAction,
  onComplete,
  onCancel,
}: LivenessCheckProps) {
  const [step, setStep] = useState<"INSTRUCTION" | "RECORDING" | "CAPTURED">("INSTRUCTION");
  const [countdown, setCountdown] = useState(3);
  const [livenessConfirmed, setLivenessConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      onCancel();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function startLiveness() {
    setStep("RECORDING");
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        captureFrame();
      }
    }, 1000);
  }

  function captureFrame() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setStep("CAPTURED");

    onComplete({
      challengeId,
      imageBase64,
      livenessCompleted: livenessConfirmed,
    });
  }

  return (
    <div className="space-y-4">
      {/* Camera */}
      <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-2 border-primary/70 camera-overlay" />
        </div>

        {step === "RECORDING" && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold text-white drop-shadow-lg">{countdown}</span>
          </div>
        )}
      </div>

      {/* Liveness instruction */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-center">
        <p className="text-sm font-medium text-primary">
          {ACTION_INSTRUCTIONS[requiredAction]}
        </p>
      </div>

      {/* Liveness self-confirm */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={livenessConfirmed}
          onChange={(e) => setLivenessConfirmed(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-muted-foreground">
          I performed the action: {ACTION_INSTRUCTIONS[requiredAction].toLowerCase()}
        </span>
      </label>

      {step === "INSTRUCTION" && (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={startLiveness} className="flex-1">Ready</Button>
        </div>
      )}

      {step === "RECORDING" && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Capturing in {countdown}…</p>
          <Progress value={(3 - countdown) * 33} className="h-1 mt-2" />
        </div>
      )}
    </div>
  );
}
