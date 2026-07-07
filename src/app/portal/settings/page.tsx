"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ProfileState {
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

export default function PortalSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({ fullName: "", phone: "", email: "", address: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((d) =>
        setProfile({
          fullName: d.fullName ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          address: d.address ?? "",
        }),
      );
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        email: profile.email || null,
        address: profile.address || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update profile");
      return;
    }
    setMessage("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to change password");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password changed");
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Profile Settings</h1>
        <Button variant="ghost" onClick={() => router.push("/portal")}>
          Back to portal
        </Button>
      </div>

      <Card>
        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="font-medium">Profile Information</h2>
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={profile.phone} disabled />
            <p className="mt-1 text-xs text-muted-text">Phone is login identity and can only be changed by admin.</p>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <Button type="submit">Save Profile</Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={changePassword} className="space-y-4">
          <h2 className="font-medium">Change Password</h2>
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <Button type="submit">Update Password</Button>
        </form>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald">{message}</p>}
    </main>
  );
}
