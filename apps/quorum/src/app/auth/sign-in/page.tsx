"use client";

import { useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const auth = createAuthClient();

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.signIn.email({ email, password });
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <h1>Organizer sign-in</h1>
      <p>Hosted Quorum uses Neon Auth for organizers. Attendees still join through private invite links with signed cookies—no account required.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Password
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%" }} />
        </label>
        {error ? <p role="alert" style={{ color: "#8b1e1e" }}>{error}</p> : null}
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
