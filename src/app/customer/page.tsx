"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { portalLogin } from "@/lib/actions";
import { useStore } from "@/lib/store";

export default function PortalLoginPage() {
  const { state, replace } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("nora@alnoor.ae");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);

  function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!state) return;
    if (otp.trim() !== "482193") {
      setError("That code is not valid.");
      return;
    }
    const result = portalLogin(state, email);
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    router.push("/customer/home");
  }

  return (
    <div className="auth-stage">
      <div className="auth-main">
        <div className="auth-card auth-card-accent">
          <span className="auth-logo" aria-hidden="true">V</span>
          <h1>Customer</h1>
          <p className="lede">{sent ? "Enter the preview code. A live desk would send it to this email." : "Use the email on your invitation. You only see files sent to you."}</p>
          <form onSubmit={verify} className="fields" style={{ gridTemplateColumns: "1fr" }}>
            <Field label="Email or mobile" required>
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </Field>
            {sent && (
              <Field label="One-time code" required hint="Preview code 482193. ">
                <input className="otp-input" value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
              </Field>
            )}
            {error && <div className="banner banner-danger">{error}</div>}
            {!sent ? (
              <Button
                type="button"
                onClick={() => {
                  setSent(true);
                  setError("");
                }}
              >
                Send code
              </Button>
            ) : (
              <div className="portal-login-actions">
                <Button type="submit">Verify and continue</Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={cooldown}
                  onClick={() => {
                    setCooldown(true);
                    setError("");
                    setTimeout(() => setCooldown(false), 3000);
                  }}
                >
                  {cooldown ? "Code sent" : "Resend code"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
