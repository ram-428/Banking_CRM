"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PortalShell } from "@/components/portal-shell";
import { ButtonLink, StatusText } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function PortalHomePage() {
  const { state, replace } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (state && !state.portalEmail) router.replace("/customer");
  }, [state, router]);

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const invites = state.invitations.filter((item) => item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired");
  const appIds = [...new Set(invites.map((item) => item.applicationId))];
  const contact = state.customers.flatMap((customer) => customer.contacts).find((item) => item.email.toLowerCase() === email);

  return (
    <PortalShell email={email} onSignOut={() => replace({ ...state, portalEmail: null })}>
      <p className="portal-kicker">Secure checklist</p>
      <h1 className="portal-title">{contact ? `Hello, ${contact.name.split(" ")[0]}` : "Your documents"}</h1>
      <p className="lede portal-lede">Upload what was requested. A file stays in review until the desk accepts that exact version.</p>
      {appIds.filter(Boolean).length === 0 && invites.every((item) => !item.requestId) && <div className="banner">No open invitation is linked to {email}.</div>}
      {appIds.map((appId) => {
        const app = state.applications.find((item) => item.id === appId);
        const customer = state.customers.find((item) => item.id === app?.customerId);
        const items = state.checklist.filter((item) => item.applicationId === appId);
        const accepted = items.filter((item) => item.status === "Approved").length;
        const waiting = items.filter((item) => item.status === "Pending Upload" || item.status === "Rejected" || item.status === "Expired").length;
        const width = items.length ? Math.round((accepted / items.length) * 100) : 0;
        return (
          <section key={appId} className="portal-file">
            <header className="portal-file-head">
              <div>
                <h2>{customer?.name ?? "Company"}</h2>
                <p>
                  {app?.number ?? "Application"} · {app?.loanType ?? "Lending"}
                </p>
              </div>
              <p className="portal-count">
                <strong>{accepted}</strong>
                <span>of {items.length} accepted</span>
              </p>
            </header>
            <div className="portal-meter" role="progressbar" aria-valuenow={accepted} aria-valuemin={0} aria-valuemax={items.length} aria-label="Accepted documents">
              <i style={{ width: `${width}%` }} />
            </div>
            <p className="hint portal-meter-note">{waiting === 0 ? "Nothing is waiting on you." : `${waiting} still need a file from you.`}</p>
            <ol className="portal-docs">
              {items.map((item, index) => (
                <li className="portal-doc" key={item.id}>
                  <span className="portal-doc-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="hint">
                      {item.category} · {item.requirement}
                    </p>
                    {item.instructions && <p className="portal-note">{item.instructions}</p>}
                    <StatusText value={item.status} />
                  </div>
                  {item.customerUpload && item.status !== "Approved" ? (
                    <ButtonLink href={`/customer/upload/${item.id}`}>{item.status === "Rejected" || item.status === "Expired" ? "Resubmit" : item.status === "Pending Upload" ? "Upload" : "View"}</ButtonLink>
                  ) : (
                    <span className="hint">{item.status === "Approved" ? "Accepted" : "With the desk"}</span>
                  )}
                </li>
              ))}
            </ol>
            {customer && customer.shareholders.length > 0 && (
              <div className="portal-holders">
                <h3>Shareholder identity</h3>
                {customer.shareholders.map((holder) => (
                  <p key={holder.id}>
                    {holder.name} · {holder.share}% · passport or Emirates ID goes with the identity documents above.
                  </p>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {invites.filter((item) => item.requestId).map((invite) => {
        const request = state.serviceRequests.find((item) => item.id === invite.requestId);
        const customer = state.customers.find((item) => item.id === request?.customerId);
        const items = state.serviceInstances.filter((item) => item.requestId === invite.requestId).flatMap((instance) => instance.checklist.map((row) => ({ ...row, serviceId: instance.serviceId })));
        if (!request || items.length === 0) return null;
        const accepted = items.filter((item) => item.status === "Approved").length;
        return (
          <section key={invite.id} className="portal-file">
            <header className="portal-file-head">
              <div>
                <h2>{customer?.name ?? "Company"}</h2>
                <p>{request.number} · service documents</p>
              </div>
              <p className="portal-count">
                <strong>{accepted}</strong>
                <span>of {items.length} accepted</span>
              </p>
            </header>
            <ol className="portal-docs">
              {items.map((item, index) => (
                <li className="portal-doc" key={item.id}>
                  <span className="portal-doc-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="hint">{item.requirement}{item.linkedFrom ? " · linked from an existing document" : ""}</p>
                    {item.rejectionReason && <p className="portal-note">Rejected: {item.rejectionReason}</p>}
                    <StatusText value={item.status} />
                  </div>
                  {item.status === "Approved" || item.linkedFrom ? (
                    <span className="hint">Accepted</span>
                  ) : (
                    <ButtonLink href={`/customer/upload/${item.id}`}>{item.status === "Rejected" ? "Resubmit" : "Upload"}</ButtonLink>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </PortalShell>
  );
}
