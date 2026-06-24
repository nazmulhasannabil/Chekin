"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/db/connection";
import { Employee, User, Branch, Department, Shift, AuditLog } from "@/lib/db/models";
import { requirePermission } from "@/lib/auth/permissions";
import { generateId } from "@/lib/utils";
import type { Role } from "@/types";

export interface InviteEmployeeInput {
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation?: string;
  branchId?: string;
  departmentId?: string;
  shiftId?: string;
  role?: Role;
  employmentType?: string;
  employmentStartDate: string;
}

export interface EmployeeActionResult {
  success: boolean;
  employeeId?: string;
  error?: string;
}

export async function inviteEmployee(input: InviteEmployeeInput): Promise<EmployeeActionResult> {
  try {
    const session = await requirePermission("employee.create");
    await connectDB();

    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Check for existing employee with same code
    const codeExists = await Employee.findOne({
      organizationId: session.organizationId,
      employeeCode: input.employeeCode,
    });
    if (codeExists) {
      return { success: false, error: "Employee code already exists." };
    }

    // Check for existing user with same email
    const userExists = await User.findOne({
      organizationId: session.organizationId,
      email: input.email.toLowerCase(),
    });
    if (userExists) {
      return { success: false, error: "A user with this email already exists." };
    }

    // Create user account (no password — they'll set via email or passkey)
    const user = await User.create({
      organizationId: session.organizationId,
      email: input.email.toLowerCase(),
      name: `${input.firstName} ${input.lastName}`,
      role: input.role ?? "EMPLOYEE",
      emailVerified: false,
      emailVerificationToken: generateId(),
      isActive: true,
    });

    // Create employee profile
    const employee = await Employee.create({
      organizationId: session.organizationId,
      userId: user._id,
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`,
      designation: input.designation,
      branch: input.branchId || undefined,
      department: input.departmentId || undefined,
      shiftId: input.shiftId || undefined,
      employmentType: input.employmentType ?? "FULL_TIME",
      employmentStartDate: new Date(input.employmentStartDate),
      status: "ACTIVE",
    });

    // Link employee back to user
    await User.updateOne({ _id: user._id }, { employeeId: employee._id });

    // Audit log
    await AuditLog.create({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "EMPLOYEE_CREATED",
      resourceType: "Employee",
      resourceId: employee._id,
      newValue: { email: input.email, employeeCode: input.employeeCode },
      ipAddress,
    });

    return { success: true, employeeId: employee._id.toString() };
  } catch (err) {
    console.error("[inviteEmployee]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "FORBIDDEN") return { success: false, error: "You don't have permission." };
    return { success: false, error: "Failed to create employee." };
  }
}

export async function updateEmployeeStatus(
  employeeId: string,
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
): Promise<EmployeeActionResult> {
  try {
    const session = await requirePermission("employee.update");
    await connectDB();

    const employee = await Employee.findOne({
      _id: employeeId,
      organizationId: session.organizationId,
    });

    if (!employee) return { success: false, error: "Employee not found." };

    const previousStatus = employee.status;
    employee.status = status;
    if (status === "ARCHIVED") {
      employee.archivedAt = new Date();
      employee.archivedBy = session.userId as unknown as typeof employee.archivedBy;
    }
    await employee.save();

    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    await AuditLog.create({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "EMPLOYEE_STATUS_CHANGED",
      resourceType: "Employee",
      resourceId: employee._id,
      previousValue: { status: previousStatus },
      newValue: { status },
      ipAddress,
    });

    return { success: true, employeeId: employee._id.toString() };
  } catch (err) {
    console.error("[updateEmployeeStatus]", err);
    return { success: false, error: "Failed to update employee." };
  }
}

export async function importEmployeesFromExcel(
  rows: InviteEmployeeInput[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    rows.map((row) => inviteEmployee(row))
  );

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      success++;
    } else {
      failed++;
      const error =
        result.status === "rejected"
          ? result.reason?.message ?? "Unknown error"
          : result.value.error ?? "Unknown error";
      errors.push(error);
    }
  }

  return { success, failed, errors };
}
