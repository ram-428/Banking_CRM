"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountTags, tally } from "@/components/count-tags";
import { PortalShell } from "@/components/portal-shell";
import { ButtonLink, DataTable, StatusText } from "@/components/ui";
import { userName } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { parentRequestStatus } from "@/lib/request-status";
import { useStore } from "@/lib/store";
import type { ServiceChecklistItem } from "@/lib/types";

const FILTERS = ["All documents", "Pending", "In progress", "Approved", "Rejected"] as const;

function bucket(item: ServiceChecklistItem): (typeof FILTERS)[number] {
  if (item.status === "Approved" || item.linkedFrom) return "Approved";
  if (item.status === "Uploaded" || item.status === "Under Review") return "In progress";
  if (item.status === "Rejected" || item.status === "Expired") return "Rejected";
  return "Pending";
}

export default function PortalRequestPage() {
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
    .filter((item) => item.requestId === id && item.email.toLowerCase() === email && item.status !== "Revoked" && item.status !== "Expired")
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const request = state.serviceRequests.find((item) => item.id === id);

  if (!request || invites.length === 0) {
    return (
      <PortalShell email={email} back={back} onSignOut={signOut}>
        <div className="banner">This request is not linked to {email}.</div>
      </PortalShell>
    );
  }

  const customer = state.customers.find((item) => item.id === request.customerId);
  const instances = state.serviceInstances.filter((item) => item.requestId === request.id);
  const all = instances.flatMap((instance) => instance.checklist);
  const latest = invites[0];

  return (
    <PortalShell email={email} back={back} onSignOut={signOut}>
      <section className="portal-request" style={{ marginTop: 0 }}>
        <div>
          <p className="portal-request-label">Request ID</p>
          <h2>{request.number}</h2>
          <p className="portal-request-meta">
            {customer?.name ?? "Company"} · {instances.length} {instances.length === 1 ? "service" : "services"}
          </p>
        </div>
        <div className="portal-request-side">
          <StatusText value={parentRequestStatus(instances)} />
          <CountTags counts={tally(all)} />
        </div>
      </section>

      <section className="portal-file">
        <header className="portal-file-head">
          <h2>Request details</h2>
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
            <dt>Request date</dt>
            <dd>{formatDate(request.requestDate)}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{request.priority}</dd>
          </div>
          <div>
            <dt>Relationship contact</dt>
            <dd>{userName(state, request.assigneeId)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(request.updatedAt)}</dd>
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
            <dt>Services</dt>
            <dd>{instances.map((instance) => state.services.find((item) => item.id === instance.serviceId)?.name ?? "Service").join(", ")}</dd>
          </div>
          <div>
            <dt>Total documents</dt>
            <dd>{all.length}</dd>
          </div>
          {latest.message && (
            <div className="wide">
              <dt>Message from the desk</dt>
              <dd>{latest.message}</dd>
            </div>
          )}
          {request.remarks && (
            <div className="wide">
              <dt>Remarks</dt>
              <dd>{request.remarks}</dd>
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

      {instances.map((instance) => {
        const service = state.services.find((item) => item.id === instance.serviceId);
        const counts = tally(instance.checklist);
        const width = instance.checklist.length ? Math.round((counts.approved / instance.checklist.length) * 100) : 0;
        const rows = instance.checklist.filter((item) => filter === "All documents" || bucket(item) === filter);
        return (
          <section key={instance.id} className="portal-file">
            <header className="portal-file-head">
              <div>
                <h2>{service?.name ?? "Service"}</h2>
                <p>
                  {request.number} · started {formatDate(instance.startedAt)} · <StatusText value={instance.status} />
                </p>
              </div>
              <p className="portal-count">
                <strong>{counts.approved}</strong>
                <span>of {instance.checklist.length} accepted</span>
              </p>
            </header>
            <CountTags counts={counts} />
            <div className="portal-meter" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label={`${service?.name ?? "Service"} accepted documents`}>
              <i style={{ width: `${width}%` }} />
            </div>
            {instance.checklist.length === 0 && <p className="hint">This service needs no documents.</p>}
            {instance.checklist.length > 0 && rows.length === 0 && <p className="hint">Nothing matches this filter.</p>}
            {rows.length > 0 && (
              <DataTable>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Document</th>
                    <th>Code</th>
                    <th>Requirement</th>
                    <th>Status</th>
                    <th>File</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const canUpload = !item.linkedFrom && (item.status === "Pending" || item.status === "Rejected" || item.status === "Expired");
                    return (
                      <tr key={item.id}>
                        <td>{String(instance.checklist.indexOf(item) + 1).padStart(2, "0")}</td>
                        <td>{item.name}</td>
                        <td className="hint">{item.documentCode}</td>
                        <td>{item.requirement}</td>
                        <td>
                          <StatusText value={item.linkedFrom && item.status !== "Approved" ? "Approved" : item.status} />
                        </td>
                        <td className="hint">{item.linkedFrom ? "Existing approved document" : item.fileName ?? "Not uploaded"}</td>
                        <td className="hint">{item.rejectionReason ?? (item.status === "Expired" ? "Expired. Upload a replacement." : "")}</td>
                        <td>
                          {canUpload ? (
                            <ButtonLink href={`/customer/upload/${item.id}`}>{item.status === "Pending" ? "Upload" : "Resubmit"}</ButtonLink>
                          ) : (
                            <span className="hint">{bucket(item) === "Approved" ? "Accepted" : "With the desk"}</span>
                          )}
                        </td>
                      </tr>
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
