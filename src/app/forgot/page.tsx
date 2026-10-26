"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ForgotPage() {
  const { state } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const user = state?.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      setError("No employee account uses that email.");
      setSent(false);
      return;
    }
    if (user.status !== "Active") {
      setError("This account is inactive, so a reset will not be sent.");
      setSent(false);
      return;
    }
    setError("");
    setSent(true);
  }

  return (
    <AuthFrame title="Forgot password" lede="We only reset active employee accounts. In this preview the password stays welcome.">
      <form onSubmit={submit} className="fields" style={{ gridTemplateColumns: "1fr" }}>
        {sent ? (
          <div className="banner banner-ok">A reset link is ready for {email}. In this preview the password stays welcome.</div>
        ) : (
          <Field label="Email address" required error={error}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
        )}
        {!sent && <Button type="submit">Send reset link</Button>}
        <p className="auth-links">
          <Link href="/">Back to sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
