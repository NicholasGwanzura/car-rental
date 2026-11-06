"use client";

import Link from "next/link";
import { BrandArtwork } from "@/components/brand-mark";
import { useState, type FormEvent } from "react";

export function InviteAcceptPage({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, password }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not accept this invitation.");
      window.location.assign("/workspace");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not accept this invitation."); }
    finally { setBusy(false); }
  }
  return <main className="workspace-login"><form className="workspace-login-card" onSubmit={submit}>
    <Link href="/" className="login-artwork-link" aria-label="Classic Rides home"><BrandArtwork className="login-artwork" /></Link><p className="eyebrow">CLASSIC RIDES</p><h1>Join the team<span>.</span></h1><p>Set up your account to access the rental workspace.</p>
    <label className="form-field"><span>Full name</span><input autoComplete="name" minLength={2} required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className="form-field"><span>Create password</span><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /><small>Use at least 12 characters.</small></label>
    {error && <p className="login-error" role="alert">{error}</p>}<button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Accept invitation"}</button>
  </form></main>;
}
