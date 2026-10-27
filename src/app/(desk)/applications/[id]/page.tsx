"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ApplicationFrame } from "@/components/application-frame";
import { can } from "@/lib/access";
import { aed, formatDate, formatWhen } from "@/lib/format";
import { captureSnapshot, deliveredTotal } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { Application, Customer } from "@/lib/types";

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useDesk();
  const app = state?.applications.find((item) => item.id === id);
  const customer = state?.customers.find((item) => item.id === app?.customerId);
  if (!state || !app || !customer) {
    return <ApplicationFrame id={id}> </ApplicationFrame>;
  }
  const subs = state.submissions.filter((item) => item.applicationId === app.id);
  const review = state.reviews.find((item) => item.applicationId === app.id);
  const delivered = deliveredTotal(state, app.id);
  return (
    <ApplicationFrame id={id}>
      <div className="work">
        <section>
          <h2 className="block-title">Request</h2>
          <dl className="facts">
            <div>
              <dt>Purpose</dt>
              <dd>{app.purpose}</dd>
            </div>
            <div>
              <dt>Tenure</dt>
              <dd>{app.tenureMonths ? `${app.tenureMonths} months` : "Not set"}</dd>
            </div>
            <div>
              <dt>Preferred banks</dt>
              <dd>{app.preferredBanks.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt>Financing date</dt>
              <dd>{formatDate(app.financingDate)}</dd>
            </div>
            <div>
              <dt>Delivered</dt>
              <dd>{aed(delivered || undefined)}</dd>
            </div>
            <div>
              <dt>Credit</dt>
              <dd>{review ? review.decision : "Not recorded"}</dd>
            </div>
          </dl>
          <h2 className="block-title" style={{ marginTop: 28 }}>
            Financial snapshot
          </h2>
          <p className="hint" style={{ marginBottom: 10 }}>
            {app.snapshotLabel}. These figures stay with this application.
          </p>
          <FinancialSnapshot app={app} customer={customer} />
        </section>
        <aside>
          <h2 className="block-title">Move the file</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <Link href={`/applications/${app.id}/checklist`}>Checklist</Link>
            {can(state, "Applications", "edit") && <Link href={`/applications/${app.id}/invite`}>Portal invitation</Link>}
            {can(state, "Financials") && <Link href={`/financials/${customer.code}`}>Financial profile</Link>}
            {can(state, "Credit") && <Link href={`/applications/${app.id}/credit`}>Credit review</Link>}
            {can(state, "Banks") && (
              <>
                <Link href={`/applications/${app.id}/banks`}>Bank submissions</Link>
                <Link href={`/applications/${app.id}/agreement`}>Agreement</Link>
                <Link href={`/applications/${app.id}/delivery`}>Disbursement</Link>
                <Link href={`/applications/${app.id}/close`}>Closure</Link>
              </>
            )}
          </div>
          <h2 className="block-title" style={{ marginTop: 28 }}>
            Banks
          </h2>
          {subs.length === 0 && <p className="hint">No bank has been submitted.</p>}
          {subs.map((sub) => (
            <p key={sub.id}>
              <strong>{sub.bank}</strong>
              <span className="hint"> · {sub.status}</span>
            </p>
          ))}
        </aside>
      </div>
    </ApplicationFrame>
  );
}

function FinancialSnapshot({ app, customer }: { app: Application; customer: Customer }) {
  const snap = app.snapshot ?? captureSnapshot(customer, app.createdAt);
  return (
    <dl className="facts">
      <div>
        <dt>Company turnover</dt>
        <dd>{aed(snap.salesTurnover)}</dd>
      </div>
      <div>
        <dt>Bank turnover</dt>
        <dd>{aed(snap.bankTurnover)}</dd>
      </div>
      <div>
        <dt>POS turnover</dt>
        <dd>{aed(snap.posTurnover)}</dd>
      </div>
      <div>
        <dt>Average balance, 6 months</dt>
        <dd>{aed(snap.avgBalance6)}</dd>
      </div>
      <div>
        <dt>Average balance, 12 months</dt>
        <dd>{aed(snap.avgBalance12)}</dd>
      </div>
      <div>
        <dt>VAT returns</dt>
        <dd>{snap.vatSummary}</dd>
      </div>
      <div>
        <dt>Existing bank exposure</dt>
        <dd>{snap.exposureSummary}</dd>
      </div>
      <div>
        <dt>Employees</dt>
        <dd>{snap.employees ?? "Not set"}</dd>
      </div>
      <div>
        <dt>Cheque bounce</dt>
        <dd>
          {snap.chequeBounce}
          {snap.bounceCount ? ` · ${snap.bounceCount} record${snap.bounceCount === 1 ? "" : "s"}` : ""}
        </dd>
      </div>
      <div>
        <dt>Audit report</dt>
        <dd>
          {snap.auditAvailable}
          {snap.auditYears !== "None recorded" ? ` · ${snap.auditYears}` : ""}
        </dd>
      </div>
      <div>
        <dt>Profile version</dt>
        <dd>{snap.profileStatus}</dd>
      </div>
      <div>
        <dt>Snapshot date</dt>
        <dd>{formatWhen(snap.capturedAt)}</dd>
      </div>
    </dl>
  );
}
