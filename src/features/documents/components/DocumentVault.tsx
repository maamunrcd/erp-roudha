"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Download, Lock, Unlock } from "lucide-react";

interface DocumentRow {
  id: string;
  label: string | null;
  isSoftLocked: boolean;
  isPublic: boolean;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface DocumentVaultProps {
  projectId: string;
}

export function DocumentVault({ projectId }: DocumentVaultProps) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents?projectId=${projectId}`);
    setDocs(await res.json());
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", projectId);
    form.append("label", label || file.name);
    form.append("isPublic", String(isPublic));
    const res = await fetch("/api/documents", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
      return;
    }
    setFile(null);
    setLabel("");
    setIsPublic(false);
    await load();
  }

  async function toggleLock(doc: DocumentRow) {
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSoftLocked: !doc.isSoftLocked }),
    });
    await load();
  }

  async function togglePublic(doc: DocumentRow) {
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !doc.isPublic }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <Card>
      <CardTitle className="mb-4">Legal document vault</CardTitle>

      <form onSubmit={handleUpload} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="doc-file">Upload file</Label>
          <Input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <div>
          <Label htmlFor="doc-label">Label</Label>
          <Input
            id="doc-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mutation deed"
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Visible on customer portal
          </label>
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-4">{error}</p>}
      </form>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-text">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{doc.label}</p>
                <p className="text-xs text-muted-text">
                  {new Date(doc.createdAt).toLocaleDateString()}
                  {doc.fileSize ? ` · ${Math.round(doc.fileSize / 1024)} KB` : ""}
                  {doc.isPublic ? " · Portal" : ""}
                  {doc.isSoftLocked ? " · Verified/Locked" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/documents/${doc.id}?download=1`}
                  className="inline-flex items-center gap-1 text-xs text-emerald hover:underline"
                >
                  <Download size={12} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => togglePublic(doc)}
                  className="text-xs text-muted-text hover:text-foreground"
                >
                  {doc.isPublic ? "Hide from portal" : "Share on portal"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLock(doc)}
                  className="inline-flex items-center gap-1 text-xs text-gold"
                >
                  {doc.isSoftLocked ? <Unlock size={12} /> : <Lock size={12} />}
                  {doc.isSoftLocked ? "Unlock" : "Verify & lock"}
                </button>
                {!doc.isSoftLocked && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
