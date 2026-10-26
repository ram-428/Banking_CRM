"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field } from "@/components/ui";
import { login } from "@/lib/actions";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { state, replace } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vrw-email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (state?.sessionUserId) router.replace("/dashboard");
  }, [state?.sessionUserId, router]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!state) return;
    if (!email.trim() || !password) {
      setError("Enter the email and password.");
      return;
    }
    const result = login(state, email, password);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (remember) localStorage.setItem("vrw-email", email.trim());
    else localStorage.removeItem("vrw-email");
    replace(result.state);
    router.push("/dashboard");
  }

  function enterAs(address: string) {
    if (!state) return;
    const result = login(state, address, "welcome");
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    router.push("/dashboard");
  }

  return (
    <AuthFrame title="Welcome Back" lede="Use your employee email. Inactive accounts stay blocked.">
      <form onSubmit={submit} className="fields" style={{ gridTemplateColumns: "1fr" }}>
        <Field label="Email or username" required error={error && !email ? "Email is required." : undefined}>
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" required>
          <div className="pass-wrap">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="pass-toggle" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Remember me
        </label>
        {error && <div className="banner banner-danger">{error}</div>}
        <Button type="submit">Log In</Button>
        <p className="auth-links">
          <Link href="/forgot">Forgot your password?</Link>
        </p>
      </form>
      <div className="desk-list">
        <h2>Open a desk</h2>
        <p className="hint" style={{ marginBottom: 8 }}>
          Preview password for every person: welcome
        </p>
        <div className="person-grid">
          {state?.users.map((person) => (
            <button key={person.id} className="person" type="button" onClick={() => enterAs(person.email)}>
              <span className="avatar">{person.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
              <span>
                <strong>{person.name}</strong>
                <span className="hint">{person.department}</span>
              </span>
              <span className="hint">{person.role}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthFrame>
  );
}
