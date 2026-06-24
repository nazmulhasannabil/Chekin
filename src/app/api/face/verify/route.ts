import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { FaceProfile, Employee } from "@/lib/db/models";
import { extractFaceDescriptor, verifyFace } from "@/lib/face/verification";
import { consumeChallenge } from "@/lib/redis/attendance-challenge";
import type { EncryptedData } from "@/lib/face/encryption";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { challengeId, imageBase64, livenessCompleted } = body;

    if (!challengeId || !imageBase64) {
      return NextResponse.json({ error: "challengeId and imageBase64 required" }, { status: 400 });
    }

    // Consume the one-time challenge (prevents replay attacks)
    const challenge = await consumeChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 400 });
    }

    if (challenge.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Challenge org mismatch" }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findOne({
      _id: challenge.employeeId,
      organizationId: session.organizationId,
    }).lean();

    if (!employee?.biometricEnrolled || !employee.faceProfileId) {
      return NextResponse.json({ error: "No face profile enrolled" }, { status: 404 });
    }

    const profile = await FaceProfile.findOne({
      _id: employee.faceProfileId,
      isActive: true,
    }).lean();

    if (!profile) {
      return NextResponse.json({ error: "Face profile not found" }, { status: 404 });
    }

    // Extract descriptor from captured image
    const { descriptor, error } = await extractFaceDescriptor(imageBase64);
    if (!descriptor || error) {
      return NextResponse.json({
        success: false,
        faceMatched: false,
        faceScore: 0,
        livenessPassed: livenessCompleted,
        error: error ?? "Face extraction failed",
      });
    }

    // Verify against stored template
    const encryptedTemplate: EncryptedData = JSON.parse(profile.encryptedDescriptor);
    const result = verifyFace(descriptor, encryptedTemplate);

    return NextResponse.json({
      success: true,
      faceMatched: result.matched,
      faceScore: result.score,
      distance: result.distance,
      livenessPassed: livenessCompleted,
      threshold: result.threshold,
      challengeAction: challenge.livenessAction,
    });
  } catch (err) {
    console.error("[face/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
