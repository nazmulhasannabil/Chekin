import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

// This augments the global scope with Serwist-specific types
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Cache API responses for offline viewing
    {
      matcher: /^\/api\/attendance/,
      handler: "NetworkFirst",
      options: {
        cacheName: "attendance-api",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
  ],
  offlineAnalyticsConfig: false,
  fallbacks: {
    document: "/offline",
  },
});

serwist.addEventListeners();

// Handle background sync for offline attendance events
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-attendance") {
    event.waitUntil(syncOfflineAttendance());
  }
});

async function syncOfflineAttendance() {
  // Get pending events from IndexedDB and replay them
  try {
    const db = await openOfflineDB();
    const pendingEvents = await getAllPendingEvents(db);

    for (const event of pendingEvents) {
      try {
        const response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });

        if (response.ok) {
          await deletePendingEvent(db, event.id);
        }
      } catch {
        // Will retry on next sync
      }
    }
  } catch {
    // IndexedDB unavailable
  }
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("chekin-offline", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending-events", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPendingEvents(db: IDBDatabase): Promise<Array<Record<string, unknown> & { id: string }>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-events", "readonly");
    const req = tx.objectStore("pending-events").getAll();
    req.onsuccess = () => resolve(req.result as Array<Record<string, unknown> & { id: string }>);
    req.onerror = () => reject(req.error);
  });
}

function deletePendingEvent(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-events", "readwrite");
    const req = tx.objectStore("pending-events").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
