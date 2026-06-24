"use client";

import { useState, useRef, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Camera, CheckCircle, AlertCircle, Info } from "lucide-react";

interface EnrollmentWizardProps {
  employeeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = "CONSENT" | "CAMERA" | "CAPTURE" | "PROCESSING" | "SUCCESS" | "ERROR";

export function EnrollmentWizard({ employeeId, onSuccess, onCancel }: EnrollmentWizardProps) {
  const [step, setStep] = useState<Step>("CONSENT");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStep("CAMERA");
    } catch {
      setError("Could not access camera. Please check permissions.");
      setStep("ERROR");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureAndEnroll = useCallback(async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setStep("PROCESSING");

    try {
      // Capture frame
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);

      stopCamera();

      const response = await fetch("/api/face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, imageBase64, consentGiven: consentAccepted }),
      });

      const data = await response.json();
      if (data.success) {
        setStep("SUCCESS");
      } else {
        setError(data.error ?? "Enrollment failed. Try again with better lighting.");
        setStep("ERROR");
      }
    } catch {
      setError("Failed to process face data. Please try again.");
      setStep("ERROR");
    } finally {
      setIsProcessing(false);
    }
  }, [employeeId, consentAccepted, stopCamera]);

  if (step === "CONSENT") {
    return (
      <GlassCard className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Biometric Consent Required</h3>
            <p className="text-xs text-muted-foreground">Bangladesh Personal Data Protection Act, 2026</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
          <p>By enrolling your face, you consent to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Collection of your facial biometric template</li>
            <li>Use of the template solely for attendance verification</li>
            <li>AES-256 encrypted storage of your template</li>
            <li>Template deletion upon employment termination</li>
          </ul>
          <p className="mt-3">You have the right to withdraw consent at any time by contacting HR.</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
          />
          <span className="text-sm">
            I have read and agree to the biometric data collection policy. I understand my rights under applicable data protection law.
          </span>
        </label>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={() => startCamera()}
            disabled={!consentAccepted}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (step === "CAMERA" || step === "PROCESSING") {
    return (
      <GlassCard className="max-w-md mx-auto space-y-4">
        <h3 className="font-semibold text-center">Face Enrollment</h3>

        <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          {/* Face guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-2 border-primary/70 camera-overlay" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Position your face in the circle</p>
          <p className="text-xs text-muted-foreground">
            Ensure good lighting · Look straight ahead · Remove glasses if possible
          </p>
        </div>

        {step === "PROCESSING" && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Processing…</p>
            <Progress value={66} className="h-1" />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => { stopCamera(); onCancel(); }}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={captureAndEnroll}
            disabled={isProcessing}
            className="flex-1 gap-2"
          >
            <Camera className="h-4 w-4" />
            {isProcessing ? "Processing…" : "Capture"}
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (step === "SUCCESS") {
    return (
      <GlassCard className="max-w-md mx-auto text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold">Enrollment Successful</h3>
        <p className="text-sm text-muted-foreground">
          Face template enrolled and encrypted. You can now use face verification for attendance.
        </p>
        <Button onClick={onSuccess} className="w-full">Done</Button>
      </GlassCard>
    );
  }

  if (step === "ERROR") {
    return (
      <GlassCard className="max-w-md mx-auto text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold">Enrollment Failed</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={() => setStep("CONSENT")} className="flex-1">Try Again</Button>
        </div>
      </GlassCard>
    );
  }

  return null;
}
