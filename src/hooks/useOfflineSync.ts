"use client";

import { useEffect, useCallback } from "react";
import type { AttendanceEventType, WorkMode } from "@/types";

interface PendingAttendanceEvent {
  id: string;
  type: AttendanceEventType;
  workMode?: WorkMode;
  workLocationNote?: string;
  idempotencyKey: string;
  clientTimestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
}

const DB_NAME = "chekin-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-events";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineEvent(event: PendingAttendanceEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingEvents(): Promise<PendingAttendanceEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingAttendanceEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingEvent(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Hook that registers a sync listener and tries to sync pending events
 * when the browser comes back online.
 */
export function useOfflineSync() {
  const syncPendingEvents = useCallback(async () => {
    try {
      const pending = await getPendingEvents();
      if (pending.length === 0) return;

      for (const event of pending) {
        try {
          const response = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...event, source: "OFFLINE_SYNC" }),
          });
          if (response.ok) {
            await removePendingEvent(event.id);
          }
        } catch {
          // Keep in queue for next attempt
        }
      }
    } catch {
      // IndexedDB unavailable in this context
    }
  }, []);

  useEffect(() => {
    window.addEventListener("online", syncPendingEvents);

    // Try syncing immediately if already online
    if (navigator.onLine) {
      syncPendingEvents();
    }

    // Register background sync if supported
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register("sync-attendance");
      }).catch(() => { /* not critical */ });
    }

    return () => {
      window.removeEventListener("online", syncPendingEvents);
    };
  }, [syncPendingEvents]);

  return { syncPendingEvents };
}
