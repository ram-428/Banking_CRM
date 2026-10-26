"use client";

import Link from "next/link";
import { can } from "@/lib/access";
import { STAGES, STAGE_HREF } from "@/lib/constants";
import { toneFor } from "@/lib/format";
import { stageIndex } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { ModuleKey, Stage } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cx("btn", `btn-${variant}`, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link className={cx("btn", `btn-${variant}`, className)} href={href}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx("field", className)}>
      <span>
        {label}
        {required && <i className="req"> *</i>}
      </span>
      {children}
      {error ? <small className="err">{error}</small> : hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

export function StatusText({ value }: { value: string }) {
  return (
    <span className={cx("status", `tone-${toneFor(value)}`)}>
      <i />
      {value}
    </span>
  );
}

export function PageHeader({
  crumbs,
  title,
  lede,
  actions,
}: {
  crumbs?: { href?: string; label: string }[];
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {crumbs && crumbs.length > 0 && (
          <div className="crumbs">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 && " / "}
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
              </span>
            ))}
          </div>
        )}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab} className="tab" role="tab" aria-selected={tab === value} onClick={() => onChange(tab)} type="button">
          {tab}
        </button>
      ))}
    </div>
  );
}

export function StageRail({
  current,
  appId,
  customerCode,
  complete,
}: {
  current: Stage;
  appId: string;
  customerCode?: string;
  complete?: boolean;
}) {
  const currentIndex = stageIndex(current);
  return (
    <nav className="rail" aria-label="Lending stages">
      {STAGES.map((stage, index) => {
        const cls = complete || index < currentIndex ? "done" : index === currentIndex ? "current" : "";
        return (
          <Link key={stage} className={cls} href={STAGE_HREF[stage](appId, customerCode)}>
            <span className="dot" />
            {stage}
          </Link>
        );
      })}
    </nav>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="banner">
      <strong>{title}</strong>
      <p className="lede">{text}</p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Gate({
  module,
  action = "view",
  children,
}: {
  module: ModuleKey;
  action?: "view" | "create" | "edit" | "delete" | "approve" | "export";
  children: React.ReactNode;
}) {
  const { state, ready } = useDesk();
  if (!ready || !state) return <DeskSkeleton />;
  if (!can(state, module, action)) {
    return (
      <div className="page">
        <PageHeader title="Outside your desk" lede="Your role does not include this module. Ask an administrator if you need access." />
      </div>
    );
  }
  return children;
}

export function DeskSkeleton() {
  return (
    <div className="page" aria-hidden>
      <div className="skel" style={{ width: 180 }} />
      <div className="skel" style={{ width: 320, height: 28 }} />
      <div className="skel" />
      <div className="skel" />
      <div className="skel" style={{ width: "70%" }} />
    </div>
  );
}
