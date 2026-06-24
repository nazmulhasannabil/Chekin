import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/permissions";
import { recordAttendanceEvent } from "@/actions/attendance";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await recordAttendanceEvent({
      type: body.type,
      workMode: body.workMode,
      workLocationNote: body.workLocationNote,
      idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
      deviceFingerprint: body.deviceFingerprint,
      location: body.location,
      faceVerification: body.faceVerification,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
