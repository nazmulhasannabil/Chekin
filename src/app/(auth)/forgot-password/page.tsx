"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth-client";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    const result = await authClient.forgetPassword({
      email: data.email,
      redirectTo: "/reset-password",
    });
    if (result.error) {
      setError(result.error.message ?? "Failed to send reset email.");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <GlassCard>
        <div className="text-center py-4">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If that email is registered, we&apos;ve sent a password reset link.
          </p>
          <a href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to sign in
          </a>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h1 className="text-xl font-semibold mb-1">Reset your password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className="bg-white/5 border-white/10"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <a href="/login" className="text-primary hover:underline">Back to sign in</a>
      </p>
    </GlassCard>
  );
}
