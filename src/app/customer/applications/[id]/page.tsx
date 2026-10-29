"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { applicationBucket, CountTags, tallyApplication } from "@/components/count-tags";
import { PortalShell } from "@/components/portal-shell";
import { ButtonLink, DataTable, StatusText } from "@/components/ui";
import { userName } from "@/lib/access";
import { aed, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

const FILTERS = ["All documents", "Pending", "In progress", "Approved", "Rejected"] as const;

export default function PortalApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace } = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All documents");

  useEffect(() => {
    if (state && !state.portalEmail) router.replace("/customer");
  }, [state, router]);

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const signOut = () => replace({ ...state, portalEmail: null });
  const back = { href: "/customer/home", label: "Back to checklist" };
  const invites = state.invitations
    .filter((item) => item.applicationId === id && item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired")
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const app = state.applications.find((item) => item.id === id);

  if (!app || invites.length === 0) {
    return (
      <PortalShell email={email} back={back} onSignOut={signOut}>
        <div className="banner">This application is not linked to {email}.</div>
      </PortalShell>
    );
  }

  const customer = state.customers.find((item) => item.id === app.customerId);
  const items = state.checklist.filter((item) => item.applicationId === app.id);
  const counts = tallyApplication(items);
  const width = items.length ? Math.round((counts.approved / items.length) * 100) : 0;
  const rows = items.filter((item) => filter === "All documents" || applicationBucket(item) === filter);
  const latest = invites[0];

  return (
    <PortalShell email={email} back={back} onSignOut={signOut}>
      <section className="portal-request" style={{ marginTop: 0 }}>
        <div>
          <p className="portal-request-label">Application ID</p>
          <h2>{app.number}</h2>
          <p className="portal-request-meta">
            {customer?.name ?? "Company"} · {app.loanType}
          </p>
        </div>
        <div className="portal-request-side">
          <StatusText value={app.status} />
          <CountTags counts={counts} />
        </div>
      </section>

      <section className="portal-file">
        <header className="portal-file-head">
          <h2>Application details</h2>
        </header>
        <dl className="portal-facts" style={{ margin: "12px 0 12px" }}>
          <div>
            <dt>Company</dt>
            <dd>{customer?.name ?? "Company"}</dd>
          </div>
          <div>
            <dt>Customer code</dt>
            <dd>{customer?.code ?? "None"}</dd>
          </div>
          <div>
            <dt>Application date</dt>
            <dd>{formatDate(app.date)}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{app.service}</dd>
          </div>
          <div>
            <dt>Loan type</dt>
            <dd>{app.loanType}</dd>
          </div>
          <div>
            <dt>Amount requested</dt>
            <dd>{aed(app.amount)}</dd>
          </div>
          <div>
            <dt>Tenure</dt>
            <dd>{app.tenureMonths ? `${app.tenureMonths} months` : "Not set"}</dd>
          </div>
          <div>
            <dt>Relationship contact</dt>
            <dd>{userName(state, app.assignedTo)}</dd>
          </div>
          <div>
            <dt>Invitation sent</dt>
            <dd>{formatDate(latest.sentAt)}</dd>
          </div>
          <div>
            <dt>Invitation expires</dt>
            <dd>{formatDate(latest.expiresAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(app.updatedAt)}</dd>
          </div>
          <div>
            <dt>Total documents</dt>
            <dd>{items.length}</dd>
          </div>
          {app.purpose && (
            <div className="wide">
              <dt>Purpose</dt>
              <dd>{app.purpose}</dd>
            </div>
          )}
          {latest.message && (
            <div className="wide">
              <dt>Message from the desk</dt>
              <dd>{latest.message}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="filters" style={{ marginTop: 14 }}>
        <select aria-label="Show documents" value={filter} onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number])}>
          {FILTERS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <section className="portal-file">
        <header className="portal-file-head">
          <div>
            <h2>Documents</h2>
            <p>{app.number} · {app.loanType}</p>
          </div>
          <p className="portal-count">
            <strong>{counts.approved}</strong>
            <span>of {items.length} accepted</span>
          </p>
        </header>
        <CountTags counts={counts} />
        <div className="portal-meter" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label="Accepted documents">
          <i style={{ width: `${width}%` }} />
        </div>
        {items.length === 0 && <p className="hint">No documents are requested on this application.</p>}
        {items.length > 0 && rows.length === 0 && <p className="hint">Nothing matches this filter.</p>}
        {rows.length > 0 && (
          <DataTable>
            <thead>
              <tr>
                <th>#</th>
                <th>Document</th>
                <th>Category</th>
                <th>Requirement</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{String(items.indexOf(item) + 1).padStart(2, "0")}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.requirement}</td>
                  <td>
                    <StatusText value={item.status} />
                  </td>
                  <td className="hint">{item.rejectionReason ?? item.instructions ?? ""}</td>
                  <td>
                    {item.customerUpload && item.status !== "Approved" ? (
                      <ButtonLink href={`/customer/upload/${item.id}`}>
                        {item.status === "Rejected" || item.status === "Expired" ? "Resubmit" : item.status === "Pending Upload" ? "Upload" : "View"}
                      </ButtonLink>
                    ) : (
                      <span className="hint">{item.status === "Approved" ? "Accepted" : "With the desk"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>

      {customer && customer.shareholders.length > 0 && (
        <section className="portal-file">
          <header className="portal-file-head">
            <h2>Shareholder identity</h2>
          </header>
          <div className="portal-holders">
            {customer.shareholders.map((holder) => (
              <p key={holder.id}>
                {holder.name} · {holder.share}% · passport or Emirates ID goes with the identity documents above.
              </p>
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  );
}
