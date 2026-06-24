import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession, requirePermission } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { Employee, FaceProfile, ConsentRecord, AuditLog } from "@/lib/db/models";
import { encryptDescriptor } from "@/lib/face/encryption";
import { extractFaceDescriptor } from "@/lib/face/verification";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { employeeId, imageBase64, consentGiven } = body;

    if (!employeeId || !imageBase64) {
      return NextResponse.json({ error: "employeeId and imageBase64 required" }, { status: 400 });
    }

    if (!consentGiven) {
      return NextResponse.json({ error: "Biometric consent required" }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findOne({
      _id: employeeId,
      organizationId: session.organizationId,
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Extract descriptor
    const { descriptor, error } = await extractFaceDescriptor(imageBase64);
    if (!descriptor || error) {
      return NextResponse.json({ error: error ?? "Face extraction failed" }, { status: 422 });
    }

    // Encrypt the descriptor
    const encrypted = encryptDescriptor(descriptor);
    const encryptedStr = JSON.stringify(encrypted);

    // Record consent
    const consent = await ConsentRecord.create({
      organizationId: session.organizationId,
      employeeId: employee._id,
      userId: session.userId,
      policyVersion: "1.0",
      acceptedAt: new Date(),
      biometricConsentAt: new Date(),
      biometricConsentPolicyVersion: "1.0",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });

    // Upsert face profile
    const profile = await FaceProfile.findOneAndUpdate(
      { organizationId: session.organizationId, employeeId: employee._id },
      {
        $set: {
          encryptedDescriptor: encryptedStr,
          encryptionKeyId: "v1",
          descriptorVersion: 1,
          enrolledAt: new Date(),
          enrolledBy: session.userId,
          consentRecordId: consent._id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          qualityScore: 0.95,
        },
      },
      { upsert: true, new: true }
    );

    // Update employee biometric status
    await Employee.updateOne(
      { _id: employee._id },
      { biometricEnrolled: true, faceProfileId: profile._id }
    );

    // Audit log
    await AuditLog.create({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "FACE_ENROLLED",
      resourceType: "FaceProfile",
      resourceId: profile._id,
      newValue: { employeeId: employee._id, enrolledAt: new Date() },
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
    });

    return NextResponse.json({ success: true, profileId: profile._id.toString() });
  } catch (err) {
    console.error("[face/enroll]", err);
    return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
  }
}
