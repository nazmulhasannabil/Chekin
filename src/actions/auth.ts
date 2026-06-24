"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connection";
import Organization from "@/lib/db/models/organization.model";
import { ensureEmployeeProfile } from "@/lib/auth/employee-profile";
import type { Role } from "@/types";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    organizationSlug: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.input<typeof registerSchema>;

export interface RegisterResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterInput, string>>;
}

async function resolveOrganizationId(slug?: string): Promise<{ organizationId: string | null; error?: string }> {
  const envOrgId = process.env.DEFAULT_ORGANIZATION_ID?.trim();
  if (envOrgId && /^[a-f0-9]{24}$/i.test(envOrgId)) {
    return { organizationId: envOrgId };
  }

  await connectDB();

  const lookupSlug =
    slug?.trim().toLowerCase() ||
    envOrgId?.toLowerCase() ||
    process.env.DEFAULT_ORGANIZATION_SLUG?.trim() ||
    "default";
  const org = await Organization.findOne({ slug: lookupSlug, isActive: true })
    .select("_id")
    .lean();

  if (!org) {
    return {
      organizationId: null,
      error: "Organization not found. Check your organization code or contact HR.",
    };
  }

  return { organizationId: org._id.toString() };
}

export async function registerWithEmail(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: RegisterResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field as keyof RegisterInput]) {
        fieldErrors[field as keyof RegisterInput] = issue.message;
      }
    }
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const org = await resolveOrganizationId(parsed.data.organizationSlug);
  if (!org.organizationId) {
    return { success: false, error: org.error ?? "Unable to determine organization." };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        organizationId: org.organizationId,
        callbackURL: "/",
      },
      headers: await headers(),
    });

    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      await ensureEmployeeProfile({
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        organizationId: org.organizationId,
        role: ((session.user as { role?: Role }).role) ?? "EMPLOYEE",
      });
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Registration failed. Try a different email.";
    if (message.toLowerCase().includes("already")) {
      return { success: false, error: "An account with this email already exists." };
    }
    return { success: false, error: message };
  }
}
