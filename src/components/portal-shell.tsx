"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function PortalShell({
  email,
  back,
  onSignOut,
  children,
}: {
  email?: string;
  back?: { href: string; label: string };
  onSignOut?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-stage">
      <header className="portal-bar">
        <div className="portal-brand">
          <span className="mark" aria-hidden="true">
            V
          </span>
          <span>
            <strong>VR Worldwide</strong>
            <small>Customer</small>
          </span>
        </div>
        <div className="portal-bar-actions">
          {back && (
            <Link className="portal-back" href={back.href}>
              {back.label}
            </Link>
          )}
          {email && <span className="portal-email">{email}</span>}
          {onSignOut && (
            <button className="btn btn-ghost" type="button" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <main className="portal-wrap">{children}</main>
    </div>
  );
}

/** Sends the customer back to sign-in when they have no session, or when every invitation for them was revoked or expired. */
export function usePortalGuard() {
  const { state, replace } = useStore();
  const router = useRouter();
  const email = state?.portalEmail ?? null;
  const valid = Boolean(
    state &&
      email &&
      state.invitations.some((item) => item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired" && new Date(item.expiresAt).getTime() > Date.now()),
  );
  useEffect(() => {
    if (!state) return;
    if (email && !valid) replace({ ...state, portalEmail: null });
    if (!valid) router.replace("/customer");
  }, [state, email, valid, replace, router]);
  return valid;
}
