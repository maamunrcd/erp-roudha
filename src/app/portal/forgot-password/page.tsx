"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to process request");
      return;
    }
    setMessage(data.message ?? "Request submitted");
    setResetToken(data.resetToken ?? "");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-card-border bg-surface p-8 space-y-4">
        <h1 className="text-xl font-semibold">Forgot Password</h1>
        <p className="text-sm text-muted-text">Enter your phone or email to get password reset instructions.</p>
        <div>
          <Label htmlFor="login">Phone or Email</Label>
          <Input id="login" value={login} onChange={(e) => setLogin(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald">{message}</p>}
        {resetToken && (
          <div className="rounded border border-gold/40 bg-gold/10 p-3 text-xs text-gold">
            Dev reset token: <span className="font-mono">{resetToken}</span>
            <div className="mt-1">
              Use this token on{" "}
              <Link href="/portal/reset-password" className="underline">
                reset password page
              </Link>
              .
            </div>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Submitting..." : "Send Reset Instructions"}
        </Button>
        <p className="text-xs text-muted-text">
          Back to{" "}
          <Link href="/portal/login" className="text-emerald hover:underline">
            login
          </Link>
        </p>
      </form>
    </div>
  );
}
