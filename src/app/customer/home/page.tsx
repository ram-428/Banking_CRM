"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountTags, tally, tallyApplication } from "@/components/count-tags";
import { FormDialog } from "@/components/form-dialog";
import { PortalShell } from "@/components/portal-shell";
import { Button, ButtonLink, Field } from "@/components/ui";
import { createPortalServiceRequest } from "@/lib/actions";
import { useStore } from "@/lib/store";

export default function PortalHomePage() {
  const { state, replace } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (state && !state.portalEmail) router.replace("/customer");
  }, [state, router]);

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const invites = state.invitations.filter((item) => item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired");
  const appIds = [...new Set(invites.map((item) => item.applicationId))].filter(Boolean);
  const requestIds = [...new Set(invites.map((item) => item.requestId).filter((item): item is string => Boolean(item)))];
  const contact = state.customers.flatMap((customer) => customer.contacts).find((item) => item.email.toLowerCase() === email);
  const activeServices = state.services.filter((item) => item.status === "Active");

  function openCreate() {
    setSelected([]);
    setRemarks("");
    setError("");
    setOpen(true);
  }

  function create() {
    const result = createPortalServiceRequest(state!, email, { serviceIds: selected, remarks });
    if (result.error || !result.id) {
      setError(result.error ?? "The request could not be created.");
      return;
    }
    replace(result.state);
    setOpen(false);
    router.push(`/customer/requests/${result.id}`);
  }

  return (
    <PortalShell email={email} onSignOut={() => replace({ ...state, portalEmail: null })}>
      <header className="portal-hero portal-hero-row">
        <div>
          <p className="portal-kicker">Secure checklist</p>
          <h1 className="portal-title">{contact ? `Hello, ${contact.name.split(" ")[0]}` : "Your documents"}</h1>
          <p className="lede portal-lede">Upload what was requested. A file stays in review until the desk accepts that exact version.</p>
        </div>
        {contact && activeServices.length > 0 && (
          <Button type="button" onClick={openCreate}>
            + Create service request
          </Button>
        )}
      </header>
      <FormDialog
        open={open}
        title="Create service request"
        description="Choose the services you need. Your relationship manager receives the request and the document checklist opens here."
        submitLabel="Create request"
        wide
        onClose={() => setOpen(false)}
        onSubmit={create}
      >
        {error && <p className="err">{error}</p>}
        <div className="check-toolbar" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div className="check-toolbar-title">
            <strong>Services</strong>
            <span className="hint">
              {selected.length} of {activeServices.length} selected
            </span>
          </div>
          <div className="row-actions">
            <Button type="button" variant="secondary" disabled={selected.length === activeServices.length} onClick={() => setSelected(activeServices.map((item) => item.id))}>
              Select all
            </Button>
            <Button type="button" variant="secondary" disabled={selected.length === 0} onClick={() => setSelected([])}>
              Deselect all
            </Button>
          </div>
        </div>
        <div className="fields" style={{ marginTop: 8 }}>
          {activeServices.map((service) => (
            <label key={service.id} className="field">
              <span>
                <input
                  type="checkbox"
                  checked={selected.includes(service.id)}
                  onChange={() => setSelected((current) => (current.includes(service.id) ? current.filter((item) => item !== service.id) : [...current, service.id]))}
                />{" "}
                {service.name}
              </span>
              <small className="hint">{service.documentCodes.length} documents to upload</small>
            </label>
          ))}
        </div>
        <Field label="What do you need?" className="span-2">
          <textarea value={remarks} maxLength={1000} onChange={(event) => setRemarks(event.target.value)} placeholder="Tell your relationship manager what this request is for" />
        </Field>
      </FormDialog>
      {appIds.length === 0 && requestIds.length === 0 && <div className="banner">No open invitation is linked to {email}.</div>}
      {appIds.map((appId) => {
        const app = state.applications.find((item) => item.id === appId);
        const customer = state.customers.find((item) => item.id === app?.customerId);
        const items = state.checklist.filter((item) => item.applicationId === appId);
        if (!app) return null;
        return (
          <section key={appId} className="portal-request">
            <div>
              <p className="portal-request-label">Application ID</p>
              <h2>{app.number}</h2>
              <p className="portal-request-meta">
                {customer?.name ?? "Company"} · {app.loanType} · {items.length} {items.length === 1 ? "document" : "documents"}
              </p>
            </div>
            <div className="portal-request-side">
              <CountTags counts={tallyApplication(items)} />
              <ButtonLink href={`/customer/applications/${app.id}`}>View details</ButtonLink>
            </div>
          </section>
        );
      })}
      {requestIds.flatMap((requestId) => {
        const request = state.serviceRequests.find((item) => item.id === requestId);
        if (!request) return [];
        const customer = state.customers.find((item) => item.id === request.customerId);
        const instances = state.serviceInstances.filter((instance) => instance.requestId === requestId && instance.checklist.length > 0);
        if (instances.length === 0) return [];
        const requestCounts = tally(instances.flatMap((instance) => instance.checklist));
        return [
          <section key={requestId} className="portal-request">
            <div>
              <p className="portal-request-label">Request ID</p>
              <h2>{request.number}</h2>
              <p className="portal-request-meta">
                {customer?.name ?? "Company"} · {instances.length} {instances.length === 1 ? "service" : "services"}: {instances.map((instance) => state.services.find((item) => item.id === instance.serviceId)?.name ?? "Service").join(", ")}
              </p>
            </div>
            <div className="portal-request-side">
              <CountTags counts={requestCounts} />
              <ButtonLink href={`/customer/requests/${request.id}`}>View details</ButtonLink>
            </div>
          </section>,
        ];
      })}
    </PortalShell>
  );
}
