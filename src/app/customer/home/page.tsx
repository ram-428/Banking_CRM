"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PortalShell, usePortalGuard } from "@/components/portal-shell";
import { ButtonLink } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function PortalHomePage() {
  const { state, replace } = useStore();
  const router = useRouter();

  usePortalGuard();

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const customer = state.customers.find((item) => item.contacts.some((contact) => contact.email.toLowerCase() === email));
  const contact = customer?.contacts.find((item) => item.email.toLowerCase() === email);
  const requests = customer ? state.serviceRequests.filter((item) => item.customerId === customer.id) : [];

  const rows = requests.map((request) => {
    const instances = state.serviceInstances.filter((item) => item.requestId === request.id);
    const items = instances.flatMap((instance) => instance.checklist);
    const mandatory = items.filter((item) => item.requirement === "Mandatory");
    const satisfied = mandatory.filter((item) => item.status === "Approved" || item.linkedFrom).length;
    return {
      request,
      services: instances.length,
      items,
      percent: mandatory.length ? Math.round((satisfied / mandatory.length) * 100) : 100,
      pending: mandatory.filter((item) => item.status === "Pending" && !item.linkedFrom).length,
      rejected: items.filter((item) => item.status === "Rejected").length,
    };
  });
  const all = rows.flatMap((row) => row.items);
  const tiles = [
    { label: "Service requests", value: requests.length },
    { label: "Pending documents", value: all.filter((item) => item.status === "Pending" && !item.linkedFrom).length },
    { label: "Under review", value: all.filter((item) => item.status === "Uploaded" || item.status === "Under Review").length },
    { label: "Approved documents", value: all.filter((item) => item.status === "Approved" || item.linkedFrom).length },
    { label: "Rejected documents", value: all.filter((item) => item.status === "Rejected").length },
  ];

  return (
    <PortalShell email={email} onSignOut={() => replace({ ...state, portalEmail: null })}>
      <p className="portal-kicker">Document portal</p>
      <h1 className="portal-title">{contact ? `Hello, ${contact.name.split(" ")[0]}` : "Your documents"}</h1>
      <p className="lede portal-lede">
        {customer ? `${customer.name} · ${customer.code}. ` : ""}Upload what was requested. A file stays in review until the desk accepts that exact version.
      </p>
      {!customer && <div className="banner">No customer account is linked to {email}.</div>}
      <section className="portal-file">
        <div className="fields" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          {tiles.map((tile) => (
            <p key={tile.label} className="portal-count" style={{ textAlign: "left" }}>
              <strong>{tile.value}</strong>
              <span>{tile.label}</span>
            </p>
          ))}
        </div>
      </section>
      <section className="portal-file">
        <header className="portal-file-head">
          <h2>My service requests</h2>
          <ButtonLink href="/customer/home" variant="secondary">
            Refresh
          </ButtonLink>
        </header>
        {rows.length === 0 && <p className="hint">No service requests yet.</p>}
        <ol className="portal-docs">
          {rows.map((row) => (
            <li className="portal-doc" key={row.request.id}>
              <span className="portal-doc-index">{row.percent}%</span>
              <div>
                <strong>{row.request.number}</strong>
                <p className="hint">
                  {formatDate(row.request.requestDate)} · {row.services} {row.services === 1 ? "service" : "services"} · {row.percent}% documents
                </p>
                <p className="hint">
                  {row.pending} pending · {row.rejected} to resubmit
                </p>
                <div className="portal-meter" role="progressbar" aria-valuenow={row.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Document progress">
                  <i style={{ width: `${row.percent}%` }} />
                </div>
              </div>
              <ButtonLink href={`/customer/requests/${row.request.id}`}>
                View documents
              </ButtonLink>
            </li>
          ))}
        </ol>
      </section>
    </PortalShell>
  );
}
