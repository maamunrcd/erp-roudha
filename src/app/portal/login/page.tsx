"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { BRAND } from "@/lib/constants/brand";

export default function PortalLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-card-border bg-surface p-8">
        <p className="text-xs uppercase tracking-widest text-emerald">Customer Portal</p>
        <h1 className="mt-1 text-xl font-semibold">{BRAND.nameEn}</h1>
        <p className="font-bengali text-sm text-muted-text">{BRAND.nameBn}</p>
        <p className="mb-6 mt-3 text-sm text-muted-text">
          Sign in with your phone or email and password.
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="login">Phone or Email</Label>
            <Input
              id="login"
              placeholder="01711000001 or you@email.com"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-text">
          <Link href="/portal/forgot-password" className="text-emerald hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted-text">
          Staff admin?{" "}
          <a href="/login" className="text-emerald hover:underline">
            Admin login
          </a>
        </p>
      </form>
    </div>
  );
}
