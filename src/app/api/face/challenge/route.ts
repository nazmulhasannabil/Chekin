import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee } from "@/lib/db/models";
import { createAttendanceChallenge } from "@/lib/redis/attendance-challenge";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const employee = await Employee.findOne({
    organizationId: session.organizationId,
    userId: session.userId,
    biometricEnrolled: true,
  }).lean();

  if (!employee) {
    return NextResponse.json({ error: "No biometric profile enrolled" }, { status: 404 });
  }

  const challenge = await createAttendanceChallenge(
    employee._id.toString(),
    session.organizationId
  );

  return NextResponse.json({
    challengeId: challenge.challengeId,
    livenessAction: challenge.livenessAction,
    expiresAt: challenge.expiresAt,
  });
}
