"use client";

import Link from "next/link";

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
