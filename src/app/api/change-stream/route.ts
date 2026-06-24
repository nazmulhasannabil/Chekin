import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { isAdmin } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const { AttendanceEvent } = await import("@/lib/db/models");

      // Send initial heartbeat
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      let changeStream: ReturnType<typeof AttendanceEvent.watch> | null = null;

      try {
        changeStream = AttendanceEvent.watch(
          [
            {
              $match: {
                "fullDocument.organizationId": { $exists: true },
                operationType: { $in: ["insert", "update"] },
              },
            },
          ],
          { fullDocument: "updateLookup" }
        );

        changeStream.on("change", (change) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = change as any;
          const event = {
            type: "attendance_update",
            documentId: c.documentKey?._id,
            operationType: change.operationType,
            employeeId: c.fullDocument?.employeeId,
            attendanceType: c.fullDocument?.type,
            status: c.fullDocument?.status,
            recordedAt: c.fullDocument?.recordedAt,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        });

        changeStream.on("error", () => {
          controller.close();
        });

        // Heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("data: {\"type\":\"ping\"}\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          changeStream?.close();
          controller.close();
        });
      } catch {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
