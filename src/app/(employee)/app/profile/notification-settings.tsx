"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const NOTIFICATION_TYPES = [
  { id: "SHIFT_REMINDER", label: "Shift reminders", description: "Get notified before your shift starts" },
  { id: "MISSED_CHECK_IN", label: "Missed check-in alerts", description: "Alert if you haven't checked in by shift start" },
  { id: "MISSING_CHECKOUT", label: "Missing checkout reminders", description: "Remind you to check out at end of shift" },
  { id: "CORRECTION_APPROVED", label: "Correction approvals", description: "When your correction request is reviewed" },
  { id: "LEAVE_APPROVED", label: "Leave approvals", description: "When your leave request is reviewed" },
  { id: "SHIFT_CHANGED", label: "Shift changes", description: "When your shift assignment changes" },
  { id: "MONTHLY_SUMMARY", label: "Monthly summary", description: "Monthly attendance report at end of month" },
  { id: "FACE_RE_ENROLLMENT", label: "Biometric reminders", description: "When your face profile needs updating" },
];

export function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Check if already subscribed
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  async function handleEnablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Push notifications are not supported in this browser.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("Permission denied. Enable notifications in your browser settings.");
        setLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setStatus("Push notifications are not configured for this organization.");
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setPushEnabled(true);
      setStatus("Push notifications enabled successfully.");
    } catch (err) {
      setStatus("Failed to enable push notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisablePush() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushEnabled(false);
      setStatus("Push notifications disabled.");
    } catch {
      setStatus("Failed to disable notifications.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Push toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Push Notifications</p>
          <p className="text-xs text-muted-foreground">Receive alerts on this device</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={pushEnabled ? handleDisablePush : handleEnablePush}
          disabled={loading}
          className="bg-white/5 border-white/10"
        >
          {loading ? "…" : pushEnabled ? "Disable" : "Enable"}
        </Button>
      </div>

      {status && (
        <p className="text-xs text-muted-foreground bg-white/5 rounded-xl px-3 py-2">{status}</p>
      )}

      {/* Notification types */}
      <div className="space-y-3 pt-2 border-t border-white/8">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm">{type.label}</p>
              <p className="text-xs text-muted-foreground">{type.description}</p>
            </div>
            <Switch defaultChecked id={type.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
