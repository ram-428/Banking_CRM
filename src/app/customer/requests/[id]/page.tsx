"use client";

import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { DocumentFiles } from "@/components/document-files";
import { PortalShell, usePortalGuard } from "@/components/portal-shell";
import { Button, ButtonLink, DataTable, StatusText } from "@/components/ui";
import { liveFiles, requiredFiles } from "@/lib/service-documents";
import { useStore } from "@/lib/store";
import type { ServiceChecklistItem } from "@/lib/types";

const FILTERS = ["All documents", "Pending documents", "Rejected documents"] as const;

function satisfied(item: ServiceChecklistItem) {
  return item.status === "Approved" || Boolean(item.linkedFrom);
}

export default function PortalRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace } = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All documents");
  const [openItem, setOpenItem] = useState<string | null>(null);

  usePortalGuard();

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const customer = state.customers.find((item) => item.contacts.some((contact) => contact.email.toLowerCase() === email));
  const request = state.serviceRequests.find((item) => item.id === id && item.customerId === customer?.id);
  const back = { href: "/customer/home", label: "Dashboard" };

  if (!customer || !request) {
    return (
      <PortalShell email={email} back={back} onSignOut={() => replace({ ...state, portalEmail: null })}>
        <div className="banner">This request is not on your account.</div>
      </PortalShell>
    );
  }

  const instances = state.serviceInstances.filter((item) => item.requestId === request.id);
  const all = instances.flatMap((instance) => instance.checklist);
  const mandatory = all.filter((item) => item.requirement === "Mandatory");
  const percent = mandatory.length ? Math.round((mandatory.filter(satisfied).length / mandatory.length) * 100) : 100;
  const show = (item: ServiceChecklistItem) => (filter === "Pending documents" ? item.status === "Pending" && !item.linkedFrom : filter === "Rejected documents" ? item.status === "Rejected" : true);

  return (
    <PortalShell email={email} back={back} onSignOut={() => replace({ ...state, portalEmail: null })}>
      <p className="portal-kicker">{request.number}</p>
      <h1 className="portal-title">{customer.name}</h1>
      <p className="lede portal-lede">
        {instances.length} {instances.length === 1 ? "service" : "services"} · {percent}% of required documents accepted. Each service is completed on its own.
      </p>
      <div className="filters">
        <select aria-label="Show documents" value={filter} onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number])}>
          {FILTERS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
      {instances.map((instance) => {
        const service = state.services.find((item) => item.id === instance.serviceId);
        const accepted = instance.checklist.filter(satisfied).length;
        const width = instance.checklist.length ? Math.round((accepted / instance.checklist.length) * 100) : 0;
        const rows = instance.checklist.filter(show);
        return (
          <section key={instance.id} className="portal-file">
            <header className="portal-file-head">
              <div>
                <h2>{service?.name ?? "Service"}</h2>
                <p>{instance.id}</p>
              </div>
              <p className="portal-count">
                <strong>{accepted}</strong>
                <span>of {instance.checklist.length} accepted</span>
              </p>
            </header>
            <div className="portal-meter" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label="Accepted documents">
              <i style={{ width: `${width}%` }} />
            </div>
            {instance.checklist.length === 0 && <p className="hint">This service needs no documents.</p>}
            {instance.checklist.length > 0 && rows.length === 0 && <p className="hint">Nothing matches this filter.</p>}
            {rows.length > 0 && (
              <DataTable>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Requirement</th>
                    <th>Files</th>
                    <th>Expiry date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const files = liveFiles(item).length;
                    const canUpload = (item.status === "Pending" && !item.linkedFrom) || item.status === "Rejected" || item.status === "Expired";
                    return (
                      <Fragment key={item.id}>
                        <tr>
                          <td>{item.name}</td>
                          <td>{item.requirement}</td>
                          <td>
                            {item.linkedFrom ? "Existing" : `${files} of ${requiredFiles(item)}`}
                          </td>
                          <td>{item.expiryDate ?? "None"}</td>
                          <td>
                            <StatusText value={item.linkedFrom && item.status !== "Approved" ? "Approved" : item.status} />
                          </td>
                          <td className="hint">{item.rejectionReason ?? (item.linkedFrom ? "Satisfied by an existing approved document" : item.status === "Expired" ? "Expired. Upload a replacement." : "")}</td>
                          <td>
                            <div className="row-actions">
                              {canUpload && <ButtonLink href={`/customer/upload/${item.id}`}>{item.status === "Rejected" ? "Resubmit" : item.status === "Expired" ? "Upload replacement" : "Upload"}</ButtonLink>}
                              {!canUpload && item.status === "Uploaded" && item.files && item.files.length > 0 && state.documents.find((doc) => doc.code === item.documentCode)?.multiple && files < requiredFiles(item) && (
                                <ButtonLink href={`/customer/upload/${item.id}`} variant="secondary">
                                  Add files
                                </ButtonLink>
                              )}
                              {(item.files?.length ?? 0) > 0 && (
                                <Button type="button" variant="secondary" onClick={() => setOpenItem(openItem === item.id ? null : item.id)}>
                                  {openItem === item.id ? "Hide" : "View / History"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {openItem === item.id && (
                          <tr key={`${item.id}-files`}>
                            <td colSpan={7}>
                              <DocumentFiles item={item} audience="customer" />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </section>
        );
      })}
    </PortalShell>
  );
}
