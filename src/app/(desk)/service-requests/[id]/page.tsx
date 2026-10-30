"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { ServicePanels, type PendingSubmit } from "@/components/service-panels";
import { Button, DataTable, Field, Gate, PageHeader, RowAction, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { saveServiceActivity, sendServiceInvitation, setChecklistStatus, transitionService } from "@/lib/actions";
import { isTerminal, mandatoryApproved, parentRequestStatus } from "@/lib/request-status";
import { useDesk } from "@/lib/store";
import type { ServiceDocStatus } from "@/lib/types";

const DOC_STATUSES: ServiceDocStatus[] = ["Pending", "Uploaded", "Under Review", "Approved", "Rejected", "Expired"];

function workflowCue(status: string, assessment: boolean) {
  if (status === "Draft") return "Request is created and assigned. Start collection to open the document checklist.";
  if (status === "Documents Pending") return "Checklist is open. Link an existing document or send the customer portal invitation for anything still outstanding.";
  if (status === "Documents Under Review") return "Verify each upload. Approve it, or reject it with a reason so the customer can resubmit.";
  if (status === "Documentation Completed") return assessment ? "Documentation is complete. Finalize the financial assessment, then start processing." : "Documentation is complete. This service has no financial assessment, so processing can start.";
  if (status === "Under Processing") return "Review the company and financial information. Ask for more information, or record the final outcome.";
  if (status === "On Hold") return "Processing is paused. Resume returns this service to the step it left.";
  if (status === "Completed") return "Closed as completed. The parent request and dashboard use this outcome.";
  if (status === "Rejected" || status === "Cancelled") return "Closed with a reason. The parent request and dashboard use this outcome.";
  return status;
}

export default function ServiceRequestWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docDrafts, setDocDrafts] = useState<Record<string, ServiceDocStatus>>({});
  const [error, setError] = useState("");
  const panelSubmit = useRef<PendingSubmit | null>(null);

  if (!state || !user) return null;
  const request = state.serviceRequests.find((item) => item.id === id);
  if (!request) {
    return (
      <Gate module="Applications">
        <div className="page">
          <PageHeader title="Request not found" lede="This service request is not in the current session." />
        </div>
      </Gate>
    );
  }
  const customer = state.customers.find((item) => item.id === request.customerId);
  const instances = state.serviceInstances.filter((item) => item.requestId === request.id);
  const history = state.audit.filter((item) => item.module === "Service Request" && item.record === request.number);

  function apply(instanceId: string, action: Parameters<typeof transitionService>[2]) {
    const outcome = transitionService(state!, instanceId, action, user!, { reason: reasons[instanceId] ?? "" });
    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    setError("");
    setReasons((current) => ({ ...current, [instanceId]: "" }));
    replace(outcome.state);
  }

  function openEditor(instanceId: string) {
    setDocDrafts({});
    setError("");
    setEditingId(instanceId);
  }

  function closeEditor() {
    setDocDrafts({});
    setError("");
    setEditingId(null);
  }

  function submitEditor(instanceId: string) {
    const instance = instances.find((item) => item.id === instanceId);
    if (!instance) return;
    let next = state!;
    for (const item of instance.checklist) {
      const status = docDrafts[item.id];
      if (!status || status === item.status) continue;
      const outcome = setChecklistStatus(next, instanceId, item.id, status, user!, status === "Rejected" ? reasons[instanceId] : undefined);
      if (outcome.error) {
        setError(`${item.name}: ${outcome.error}`);
        return;
      }
      next = outcome.state;
    }
    if (panelSubmit.current) {
      const outcome = panelSubmit.current(next);
      if (outcome.error) {
        setError(outcome.error);
        return;
      }
      next = outcome.state;
    }
    if (next !== state) replace(next);
    closeEditor();
  }

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader
          crumbs={[{ href: "/service-requests", label: "Service request list" }, { label: request.number }]}
          title={request.number}
          lede={`${customer?.name ?? "Unknown customer"} · ${customer?.code ?? ""} · assigned to ${userName(state, request.assigneeId)} · ${request.priority}`}
          actions={<StatusText value={parentRequestStatus(instances)} />}
        />
        {error && <p className="err">{error}</p>}
        <div className="svc-pair">
          <div style={{ display: "grid", gap: 14 }}>
            {customer && (
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Customer details</h2>
                    <p className="hint">
                      {customer.code} · {customer.relationship}
                    </p>
                  </div>
                  <RowAction icon="edit" label="Edit customer details" href={`/customers/${customer.code}`} />
                </div>
                <dl className="fields">
                  <div className="field"><span>Company</span><strong>{customer.name}</strong></div>
                  <div className="field"><span>Legal type</span><strong>{customer.legalType}</strong></div>
                  <div className="field"><span>Trade license</span><strong>{customer.tradeLicense}</strong></div>
                  <div className="field"><span>Line of business</span><strong>{customer.lob}</strong></div>
                  <div className="field"><span>Location</span><strong>{customer.emirate}, {customer.country}</strong></div>
                  <div className="field"><span>Address</span><strong>{customer.address}</strong></div>
                  {customer.contacts[0] && (
                    <div className="field">
                      <span>Primary contact</span>
                      <strong>{customer.contacts[0].name}</strong>
                      <small className="hint">{[customer.contacts[0].mobile, customer.contacts[0].email].filter(Boolean).join(" · ")}</small>
                    </div>
                  )}
                </dl>
                <p className="hint">
                  <Link className="link" href={`/customers/${customer.code}`}>
                    Open customer record
                  </Link>
                </p>
              </section>
            )}
            <section className="panel">
              <h2>Request history</h2>
              {history.length === 0 ? (
                <p className="hint">No service events have been recorded for this request yet.</p>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Event</th>
                      <th>By</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((event) => (
                      <tr key={event.id}>
                        <td>{event.at}</td>
                        <td>{event.action}</td>
                        <td>{userName(state, event.actorId)}</td>
                        <td>
                          {event.previous ? `${event.previous} → ${event.next ?? ""}` : event.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </section>
          </div>
          {[...instances].sort((a, b) => {
            const nameOf = (serviceId: string) => state.services.find((item) => item.id === serviceId)?.name ?? "";
            const rank = (name: string) => (name === "Account services" ? 0 : name === "Facility services" ? 1 : 2);
            return rank(nameOf(a.serviceId)) - rank(nameOf(b.serviceId));
          }).map((instance) => {
            const service = state.services.find((item) => item.id === instance.serviceId);
            const locked = isTerminal(instance.status);
            return (
              <section key={instance.id} className="panel">
                <div className="panel-head">
                  <div>
                    <h2>{service?.name ?? "Service"}</h2>
                    <p className="hint">
                      {userName(state, instance.assigneeId)}
                      {instance.assessmentRequired ? " · assessment required" : " · assessment not required"}
                      {" · "}
                      <StatusText value={instance.status} />
                    </p>
                  </div>
                  <RowAction icon="edit" label={`Edit ${service?.name ?? "service"}`} onClick={() => openEditor(instance.id)} />
                </div>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Requirement</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instance.checklist.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.name}
                          {item.fileName && <div className="hint">{item.fileName}</div>}
                          {item.rejectionReason && <div className="hint">Rejected: {item.rejectionReason}</div>}
                        </td>
                        <td>{item.requirement}</td>
                        <td><StatusText value={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <ServicePanels
                  mode="view"
                  state={state}
                  instance={instance}
                  customerId={request.customerId}
                  user={user}
                  locked={locked}
                  onChange={replace}
                  onError={setError}
                />
                {instance.closureReason && <p className="hint">Closure reason: {instance.closureReason}</p>}
                {instance.holdReason && instance.status === "On Hold" && <p className="hint">Hold reason: {instance.holdReason}</p>}
                <FormDialog
                  open={editingId === instance.id}
                  title={`Edit ${service?.name ?? "service"}`}
                  submitLabel="Submit"
                  cancelLabel="Close"
                  onClose={closeEditor}
                  onSubmit={() => submitEditor(instance.id)}
                >
                  {error && <p className="err">{error}</p>}
                  <p className="hint">{workflowCue(instance.status, instance.assessmentRequired)}</p>
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Requirement</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instance.checklist.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.requirement}</td>
                          <td>
                            <select
                              aria-label={`${item.name} status`}
                              value={docDrafts[item.id] ?? item.status}
                              disabled={locked || instance.status === "On Hold" || !can(state, "Applications", "edit")}
                              onChange={(event) => setDocDrafts((current) => ({ ...current, [item.id]: event.target.value as ServiceDocStatus }))}
                            >
                              {DOC_STATUSES.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                  <p className="hint">{mandatoryApproved(instance) ? "Mandatory documents are approved." : "Mandatory documents are still outstanding."}</p>
                  {!mandatoryApproved(instance) && (
                    <div className="row-actions">
                      <Button type="button" onClick={() => {
                        const outcome = sendServiceInvitation(state, request.id, user);
                        if (outcome.error) setError(outcome.error);
                        else { setError(""); replace(outcome.state); }
                      }}>Send portal invitation</Button>
                      <Button type="button" variant="secondary" onClick={() => {
                        const outcome = saveServiceActivity(state, {
                          instanceId: instance.id,
                          requestId: request.id,
                          type: "Follow-up",
                          subject: "Request missing documents",
                          assigneeId: instance.assigneeId,
                          due: new Date().toISOString().slice(0, 10),
                          description: "Outstanding mandatory documents are still on the checklist.",
                          communicationWith: "Customer",
                        }, user);
                        if (outcome.error) setError(outcome.error);
                        else { setError(""); replace(outcome.state); }
                      }}>Request missing documents</Button>
                    </div>
                  )}
                  <ServicePanels
                    mode="edit"
                    submitRef={panelSubmit}
                    state={state}
                    instance={instance}
                    customerId={request.customerId}
                    user={user}
                    locked={locked}
                    onChange={replace}
                    onError={setError}
                  />
                  <div style={{ display: "grid", gap: 12 }}>
                    <Field label="Reason or remarks">
                      <input value={reasons[instance.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [instance.id]: event.target.value }))} placeholder="Required for hold, completion, rejection, and cancellation" />
                    </Field>
                    <div className="row-actions">
                      {instance.status === "Draft" && <Button type="button" onClick={() => apply(instance.id, "start")}>Start collection</Button>}
                      {instance.status === "Documents Pending" && <Button type="button" onClick={() => apply(instance.id, "review")}>Send for review</Button>}
                      {(instance.status === "Documents Pending" || instance.status === "Documents Under Review") && (
                        <Button type="button" onClick={() => apply(instance.id, "docs-complete")}>Complete documentation</Button>
                      )}
                      {instance.status === "Documentation Completed" && <Button type="button" onClick={() => apply(instance.id, "process")}>Start processing</Button>}
                      {instance.status !== "On Hold" && instance.status !== "Draft" && <Button type="button" onClick={() => apply(instance.id, "hold")}>Hold</Button>}
                      {instance.status === "On Hold" && <Button type="button" onClick={() => apply(instance.id, "resume")}>Resume</Button>}
                      {instance.status === "Under Processing" && <Button type="button" variant="secondary" onClick={() => {
                        const outcome = saveServiceActivity(state, {
                          instanceId: instance.id,
                          requestId: request.id,
                          type: "Follow-up",
                          subject: "Additional information required",
                          assigneeId: instance.assigneeId,
                          due: new Date().toISOString().slice(0, 10),
                          description: reasons[instance.id] || "Processing needs more information before the outcome can be recorded.",
                        }, user);
                        if (outcome.error) setError(outcome.error);
                        else { setError(""); replace(outcome.state); }
                      }}>Additional information</Button>}
                      {instance.status === "Under Processing" && <Button type="button" variant="secondary" onClick={() => {
                        const outcome = saveServiceActivity(state, {
                          instanceId: instance.id,
                          requestId: request.id,
                          type: "Follow-up",
                          subject: "Continue service processing",
                          assigneeId: instance.assigneeId,
                          due: new Date().toISOString().slice(0, 10),
                          description: reasons[instance.id] || "Processing is not finished. Continue and update progress.",
                        }, user);
                        if (outcome.error) setError(outcome.error);
                        else { setError(""); replace(outcome.state); }
                      }}>Processing not complete</Button>}
                      {instance.status === "Under Processing" && <Button type="button" onClick={() => apply(instance.id, "complete")}>Complete</Button>}
                      {instance.status !== "Draft" && instance.status !== "On Hold" && <Button type="button" onClick={() => apply(instance.id, "reject")}>Reject</Button>}
                      <Button type="button" onClick={() => apply(instance.id, "cancel")}>Cancel</Button>
                    </div>
                  </div>
                </FormDialog>
              </section>
            );
          })}
        </div>
      </div>
    </Gate>
  );
}
