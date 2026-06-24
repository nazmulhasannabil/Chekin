"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signIn } from "@/lib/auth/auth-client";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setError("");
    const result = await signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/",
    });
    if (result.error) {
      setError(result.error.message ?? "Invalid credentials.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handlePasskeyLogin() {
    setPasskeyLoading(true);
    setError("");
    try {
      const result = await signIn.passkey({ autoFill: true });
      if (result?.error) {
        setError(result.error.message ?? "Passkey sign-in failed.");
      } else if (result?.data) {
        router.push("/");
      }
    } catch {
      setError("Passkey sign-in failed. Make sure you have a registered passkey.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <GlassCard>
      <h1 className="text-xl font-semibold mb-1">Sign in to Chekin</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your credentials or use your device passkey.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email or Employee ID</Label>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className="bg-white/5 border-white/10"
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-transparent px-2 text-xs text-muted-foreground">
          or
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full bg-white/5 border-white/10 hover:bg-white/10"
        onClick={handlePasskeyLogin}
        disabled={passkeyLoading}
        type="button"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z"/>
          <circle cx="12" cy="13" r="2"/>
        </svg>
        {passkeyLoading ? "Authenticating…" : "Sign in with Passkey"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </GlassCard>
  );
}
