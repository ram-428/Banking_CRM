"use client";

import Link from "next/link";
import { can, userName } from "@/lib/access";
import { aed, formatDate } from "@/lib/format";
import { isOverdue, nextStep, progress } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { Application } from "@/lib/types";
import { ButtonLink, PageHeader, StageRail, StatusText } from "./ui";

export function useRecord(id: string) {
  const desk = useDesk();
  const application = desk.state?.applications.find((item) => item.id === id);
  const customer = desk.state?.customers.find((item) => item.id === application?.customerId);
  const contact = customer?.contacts.find((item) => item.id === application?.ownerContactId) ?? customer?.contacts[0];
  return { ...desk, application, customer, contact };
}

export function ApplicationFrame({
  id,
  lede,
  actions,
  children,
}: {
  id: string;
  lede?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { state, application, customer } = useRecord(id);
  if (!state) return null;
  if (!application || !customer) {
    return (
      <div className="page">
        <PageHeader title="Application not found" lede="It may have been cleared when the demo data was reset." />
        <Link href="/applications">Back to applications</Link>
      </div>
    );
  }
  const items = state.checklist.filter((item) => item.applicationId === application.id);
  const ratio = progress(items);
  let step = nextStep(application, customer.code);
  const blocked =
    (step.href.startsWith("/verification") && !can(state, "Verification")) ||
    (step.href.includes("/financials") && !can(state, "Financials")) ||
    (step.href.endsWith("/credit") && !can(state, "Credit")) ||
    ((step.href.endsWith("/banks") || step.href.endsWith("/agreement") || step.href.endsWith("/delivery") || step.href.endsWith("/close")) && !can(state, "Banks"));
  if (blocked) step = { label: "Review checklist", href: `/applications/${application.id}/checklist` };
  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/applications", label: "Application list" }, { label: application.number }]}
        title={customer.name}
        lede={lede ?? `${application.number} · ${application.loanType} · ${aed(application.amount)}`}
        actions={actions ?? <ButtonLink href={step.href}>{step.label}</ButtonLink>}
      />
      <dl className="facts" style={{ marginBottom: 8 }}>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusText value={application.status} />
          </dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>
            <Link className="link" href={`/customers/${customer.code}`}>
              {customer.code}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Sales</dt>
          <dd>{userName(state, application.assignedTo)}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>
            {application.currentStage}
            {isOverdue(application) ? " · overdue" : ""}
          </dd>
        </div>
        <div>
          <dt>Required documents</dt>
          <dd>
            {ratio.done} of {ratio.required} approved
          </dd>
        </div>
        <div>
          <dt>Snapshot</dt>
          <dd>{application.snapshotLabel}</dd>
        </div>
      </dl>
      <StageRail current={application.currentStage} appId={application.id} customerCode={customer.code} complete={application.status === "Closed"} />
      {application.pendingReason && <div className="banner">{application.pendingReason}</div>}
      {children}
    </div>
  );
}

export function ApplicationSummary({ application }: { application: Application }) {
  return (
    <p className="hint">
      Opened {formatDate(application.date)}
      {application.financingDate ? ` · finance wanted ${formatDate(application.financingDate)}` : ""}
    </p>
  );
}
