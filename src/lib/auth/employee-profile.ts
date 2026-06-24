import mongoose from "mongoose";
import connectDB from "@/lib/db/connection";
import { Employee, Organization, User } from "@/lib/db/models";
import type { AuthContext } from "./permissions";

function isObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === value;
}

/** Map Better Auth organizationId (ObjectId or slug) to a Mongoose ObjectId string. */
export async function resolveOrganizationObjectId(
  organizationId: string
): Promise<string | null> {
  if (isObjectId(organizationId)) {
    return organizationId;
  }

  await connectDB();
  const slug = organizationId.toLowerCase();
  let org = await Organization.findOne({ slug, isActive: true }).select("_id").lean();

  if (!org && process.env.NODE_ENV !== "production") {
    org = await Organization.create({
      name: slug === "default" || slug === "default-org" ? "Default Organization" : organizationId,
      slug,
      contactEmail: "admin@chekin.local",
    });
  }

  return org?._id.toString() ?? null;
}

async function syncBetterAuthEmployeeId(
  authUserId: string,
  employeeId: string
): Promise<void> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) return;

  await db.collection("user").updateOne(
    { $or: [{ id: authUserId }, { _id: authUserId }] },
    { $set: { employeeId } }
  );
}

/**
 * Ensure a self-registered Better Auth user has Mongoose User + Employee records.
 */
export async function ensureEmployeeProfile(session: AuthContext): Promise<string | null> {
  const organizationId = await resolveOrganizationObjectId(session.organizationId);
  if (!organizationId) return null;

  await connectDB();

  let appUser = await User.findOne({
    organizationId,
    email: session.email.toLowerCase(),
  });

  if (!appUser) {
    appUser = await User.create({
      organizationId,
      email: session.email.toLowerCase(),
      name: session.name,
      role: session.role,
      emailVerified: true,
      isActive: true,
    });
  }

  let employee = await Employee.findOne({
    organizationId,
    userId: appUser._id,
  });

  if (!employee) {
    const nameParts = session.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? session.name;
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const codeSuffix = session.userId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "NEW";

    employee = await Employee.create({
      organizationId,
      userId: appUser._id,
      employeeCode: `EMP-${codeSuffix}`,
      firstName,
      lastName,
      displayName: session.name,
      employmentStartDate: new Date(),
      employmentType: "FULL_TIME",
      status: "ACTIVE",
    });

    appUser.employeeId = employee._id;
    await appUser.save();
  }

  await syncBetterAuthEmployeeId(session.userId, employee._id.toString());

  const db = mongoose.connection.db;
  if (db && organizationId !== session.organizationId) {
    await db.collection("user").updateOne(
      { $or: [{ id: session.userId }, { _id: session.userId }] },
      { $set: { organizationId } }
    );
  }

  return employee._id.toString();
}

/**
 * Resolve the employee record for the current session, creating one if missing.
 */
export async function getEmployeeForSession(session: AuthContext) {
  const organizationId = await resolveOrganizationObjectId(session.organizationId);
  if (!organizationId) return null;

  await connectDB();

  if (session.employeeId && isObjectId(session.employeeId)) {
    const byId = await Employee.findOne({
      _id: session.employeeId,
      organizationId,
    }).lean();
    if (byId) return byId;
  }

  const appUser = await User.findOne({
    organizationId,
    email: session.email.toLowerCase(),
  }).lean();

  if (appUser) {
    const byUser = await Employee.findOne({
      organizationId,
      userId: appUser._id,
    }).lean();
    if (byUser) return byUser;
  }

  const employeeId = await ensureEmployeeProfile(session);
  if (!employeeId) return null;

  return Employee.findById(employeeId).lean();
}
