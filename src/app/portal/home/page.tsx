"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StatusText } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function PortalHomePage() {
  const { state, replace } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (state && !state.portalEmail) router.replace("/portal");
  }, [state, router]);

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const invites = state.invitations.filter((item) => item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired");
  const appIds = [...new Set(invites.map((item) => item.applicationId))];
  const contactName = state.customers.flatMap((customer) => customer.contacts).find((contact) => contact.email.toLowerCase() === email)?.name;

  return (
    <div>
      <header className="portal-bar">
        <strong>VR Worldwide · Secure portal</strong>
        <button className="btn btn-ghost" type="button" onClick={() => replace({ ...state, portalEmail: null })}>
          Sign out
        </button>
      </header>
      <div className="portal-wrap">
        <h1 style={{ fontSize: 28, letterSpacing: "-0.03em" }}>{contactName ? `Hello, ${contactName.split(" ")[0]}` : "Your documents"}</h1>
        <p className="lede">Upload what is asked. A file stays in review until the bank desk accepts that exact version.</p>
        {appIds.length === 0 && <div className="banner">No open invitation is linked to {email}.</div>}
        {appIds.map((appId) => {
          const app = state.applications.find((item) => item.id === appId);
          const customer = state.customers.find((item) => item.id === app?.customerId);
          const items = state.checklist.filter((item) => item.applicationId === appId);
          return (
            <section key={appId} style={{ marginTop: 28 }}>
              <h2>
                {customer?.name} · {app?.number}
              </h2>
              {items.map((item) => (
                <div className="check-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <div className="hint">
                      {item.category} · {item.requirement}
                      {item.instructions ? ` · ${item.instructions}` : ""}
                    </div>
                    <StatusText value={item.status} />
                  </div>
                  <div>
                    {item.customerUpload && item.status !== "Approved" ? (
                      <Link className="btn btn-primary" href={`/portal/upload/${item.id}`}>
                        {item.status === "Rejected" ? "Resubmit" : item.status === "Pending Upload" ? "Upload" : "View"}
                      </Link>
                    ) : (
                      <span className="hint">{item.status === "Approved" ? "Accepted" : "Handled by the bank desk"}</span>
                    )}
                  </div>
                </div>
              ))}
              {customer && customer.shareholders.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h3>Shareholder identity</h3>
                  {customer.shareholders.map((holder) => (
                    <p key={holder.id} className="hint">
                      {holder.name} · {holder.share}% · passport or Emirates ID can be added with the identity documents above.
                    </p>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
