"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ApplicationFrame } from "@/components/application-frame";
import { can } from "@/lib/access";
import { aed, formatDate } from "@/lib/format";
import { deliveredTotal } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

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
            Read from {app.snapshotLabel}. Figures are not retyped on the application.
          </p>
          <dl className="facts">
            <div>
              <dt>Sales turnover</dt>
              <dd>{aed(customer.salesTurnover)}</dd>
            </div>
            <div>
              <dt>Bank turnover</dt>
              <dd>{aed(customer.bankTurnover)}</dd>
            </div>
            <div>
              <dt>Average balance, 6 months</dt>
              <dd>{aed(customer.avgBalance6)}</dd>
            </div>
            <div>
              <dt>Employees</dt>
              <dd>{customer.employees ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Cheque bounce</dt>
              <dd>{customer.chequeBounce}</dd>
            </div>
            <div>
              <dt>Audit</dt>
              <dd>{customer.auditAvailable}</dd>
            </div>
          </dl>
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
