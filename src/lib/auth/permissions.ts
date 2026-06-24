import { headers } from "next/headers";
import { auth } from "./auth";
import type { Permission, Role } from "@/types";
import { ROLE_PERMISSIONS } from "@/types";

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  employeeId?: string;
  role: Role;
}

/**
 * Get the current session on the server. Returns null if unauthenticated.
 * Always call this inside Server Actions and Route Handlers.
 */
export async function getServerSession(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  const user = session.user as typeof session.user & {
    organizationId?: string;
    role?: Role;
    employeeId?: string;
  };

  if (!user.organizationId) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    employeeId: user.employeeId,
    role: (user.role as Role) ?? "EMPLOYEE",
  };
}

/**
 * Get session and throw if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Check if a role has a specific permission.
 */
export function can(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission);
}

/**
 * Require a specific permission. Throws if not authorized.
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const session = await requireAuth();
  if (!can(session.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Check if the authenticated user belongs to the given organization.
 * Throws if org mismatch — prevents cross-org data access.
 */
export async function requireOrgAccess(organizationId: string): Promise<AuthContext> {
  const session = await requireAuth();
  if (session.organizationId !== organizationId) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Require that the current user can access a specific employee's data.
 * Employees can only access their own data unless they have team/all read access.
 */
export async function requireEmployeeAccess(
  targetEmployeeId: string,
  teamEmployeeIds?: string[]
): Promise<AuthContext> {
  const session = await requireAuth();

  if (can(session.role, "attendance.read.all")) return session;

  if (
    can(session.role, "attendance.read.team") &&
    teamEmployeeIds?.includes(targetEmployeeId)
  ) {
    return session;
  }

  if (
    can(session.role, "attendance.read.self") &&
    session.employeeId === targetEmployeeId
  ) {
    return session;
  }

  throw new Error("FORBIDDEN");
}

export const adminRoles: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "BRANCH_ADMIN"];
export const managerRoles: Role[] = [...adminRoles, "MANAGER"];

export function isAdmin(role: Role): boolean {
  return adminRoles.includes(role);
}

export function isManagerOrAbove(role: Role): boolean {
  return managerRoles.includes(role);
}
