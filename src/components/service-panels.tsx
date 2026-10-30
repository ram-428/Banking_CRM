"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, DataTable, Field, RowAction } from "@/components/ui";
import { userName } from "@/lib/access";
import { progressServiceActivity, saveLoanDelivery, saveServiceActivity, transitionService } from "@/lib/actions";
import { BANKS, LOAN_TYPES } from "@/lib/constants";
import { aed } from "@/lib/format";
import type { AssessmentResult, ServiceActivity, ServiceInstance, State, User } from "@/lib/types";

export type PendingSubmit = (current: State) => { state: State; error?: string };

export function ServicePanels({
  state,
  instance,
  customerId,
  user,
  locked,
  mode = "view",
  submitRef,
  onChange,
  onError,
}: {
  state: State;
  instance: ServiceInstance;
  customerId: string;
  user: User;
  locked: boolean;
  mode?: "view" | "edit";
  submitRef?: { current: PendingSubmit | null };
  onChange: (next: State) => void;
  onError: (message: string) => void;
}) {
  const customer = state.customers.find((item) => item.id === customerId);
  const periods = customer?.turnovers ?? [];
  const activities = state.serviceActivities.filter((item) => item.instanceId === instance.id);
  const delivery = state.loanDeliveries.find((item) => item.instanceId === instance.id);
  const [periodId, setPeriodId] = useState(instance.financialPeriodId ?? periods[0]?.id ?? "");
  const [result, setResult] = useState<AssessmentResult>(instance.assessmentResult ?? "Satisfactory");
  const [remarks, setRemarks] = useState(instance.assessmentRemarks ?? "");
  const [open, setOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [draft, setDraft] = useState<Partial<ServiceActivity>>({ type: "Task", assigneeId: user.id, status: "Pending" });
  const [bank, setBank] = useState(delivery?.bank ?? "Emirates NBD");
  const [otherBank, setOtherBank] = useState(delivery?.otherBank ?? "");
  const [loanType, setLoanType] = useState(delivery?.loanType ?? "Business Loan");
  const [date, setDate] = useState(delivery?.date ?? "");
  const [value, setValue] = useState(String(delivery?.value ?? ""));
  const [deliveryRemarks, setDeliveryRemarks] = useState(delivery?.remarks ?? "");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const period = periods.find((item) => item.id === (instance.financialPeriodId || periodId));
  const stored = instance.assessmentSnapshot?.from ? instance.assessmentSnapshot : undefined;
  const summary = stored ?? (period ? { from: period.from, to: period.to, sales: period.sales, pos: period.pos, bank: period.bank, source: period.source } : undefined);

  function finalize() {
    const outcome = transitionService(state, instance.id, "finalize-assessment", user, { result, remarks, periodId });
    if (outcome.error) onError(outcome.error);
    else {
      onError("");
      onChange(outcome.state);
    }
  }

  function saveActivity() {
    const outcome = saveServiceActivity(
      state,
      {
        ...draft,
        instanceId: instance.id,
        requestId: instance.requestId,
        type: draft.type ?? "Task",
        subject: draft.subject ?? "",
        assigneeId: draft.assigneeId ?? user.id,
      },
      user,
    );
    if (outcome.error) onError(outcome.error);
    else {
      onError("");
      setOpen(false);
      onChange(outcome.state);
    }
  }

  function move(activityId: string, action: "start" | "complete" | "cancel", note: string) {
    const outcome = progressServiceActivity(state, activityId, action, user, note);
    if (outcome.error) onError(outcome.error);
    else {
      onError("");
      onChange(outcome.state);
    }
  }

  function openDelivery() {
    setBank(delivery?.bank ?? "Emirates NBD");
    setOtherBank(delivery?.otherBank ?? "");
    setLoanType(delivery?.loanType ?? "Business Loan");
    setDate(delivery?.date ?? "");
    setValue(String(delivery?.value ?? ""));
    setDeliveryRemarks(delivery?.remarks ?? "");
    setDeliveryError("");
    setDeliveryOpen(true);
  }

  function saveDelivery() {
    const outcome = saveLoanDelivery(
      state,
      { id: delivery?.id, customerId, instanceId: instance.id, requestId: instance.requestId, bank, otherBank, loanType, date, value: Number(value), remarks: deliveryRemarks },
      user,
    );
    if (outcome.error) setDeliveryError(outcome.error);
    else {
      setDeliveryError("");
      setDeliveryOpen(false);
      onChange(outcome.state);
    }
  }

  const assessmentOpen = instance.assessmentRequired && instance.assessmentStatus !== "Finalized" && !locked;
  const assessmentDirty =
    assessmentOpen &&
    (result !== (instance.assessmentResult ?? "Satisfactory") ||
      remarks !== (instance.assessmentRemarks ?? "") ||
      (periodId !== "" && periodId !== (instance.financialPeriodId ?? periods[0]?.id ?? "")));

  function submitPending(current: State) {
    let next = current;
    if (assessmentDirty) {
      const outcome = transitionService(next, instance.id, "save-assessment-draft", user, { result, remarks, periodId });
      if (outcome.error) return outcome;
      next = outcome.state;
    }
    return { state: next };
  }

  useEffect(() => {
    if (!submitRef || mode !== "edit") return;
    submitRef.current = submitPending;
    return () => {
      submitRef.current = null;
    };
  });

  return mode === "view" ? (
    <div className="svc-view">
      <p className="hint">
        {instance.assessmentRequired
          ? summary
            ? `Assessment ${instance.assessmentResult ?? "not set"}. ${summary.from} to ${summary.to}. Sales ${aed(summary.sales)}, POS ${aed(summary.pos)}, bank ${aed(summary.bank)}.`
            : "Financial assessment is required. No turnover period is recorded yet."
          : "Financial assessment is not required."}
      </p>
      <div className="svc-section-head">
        <h3>Activities</h3>
        {!locked && <RowAction icon="edit" label="Edit activities" onClick={() => setActivitiesOpen(true)} />}
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Assigned to</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td>{activity.subject}</td>
              <td>{activity.type}</td>
              <td>{userName(state, activity.assigneeId)}</td>
              <td>{activity.due || "None"}</td>
              <td>{activity.status}</td>
            </tr>
          ))}
          {activities.length === 0 && (
            <tr>
              <td colSpan={5}>No activities on this service.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <div className="svc-section-head">
        <h3>Loan delivery</h3>
        {!locked && <RowAction icon="edit" label="Edit loan delivery" onClick={openDelivery} />}
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Bank</th>
            <th>Loan type</th>
            <th>Date</th>
            <th>Value</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {delivery ? (
            <tr>
              <td>{delivery.bank === "Other" ? delivery.otherBank || "Other" : delivery.bank}</td>
              <td>{delivery.loanType}</td>
              <td>{delivery.date || "None"}</td>
              <td>{aed(delivery.value)}</td>
              <td>{delivery.remarks || "None"}</td>
            </tr>
          ) : (
            <tr>
              <td colSpan={5}>Not recorded.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <FormDialog open={activitiesOpen} title="Edit activities" submitLabel="Done" cancelLabel="Close" wide onClose={() => setActivitiesOpen(false)} onSubmit={() => setActivitiesOpen(false)}>
      <DataTable>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Type</th>
              <th>Assigned to</th>
              <th>Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const overdue = activity.due && activity.status !== "Completed" && activity.status !== "Cancelled" && activity.due < new Date().toISOString().slice(0, 10);
              const closed = activity.status === "Completed" || activity.status === "Cancelled";
              return (
                <tr key={activity.id}>
                  <td>
                    {activity.subject}
                    {activity.communicationWith && <div className="hint">{activity.communicationWith}{activity.contact ? ` · ${activity.contact}` : ""}</div>}
                  </td>
                  <td>{activity.type}</td>
                  <td>{userName(state, activity.assigneeId)}</td>
                  <td>{activity.due || "None"}{overdue ? " · Overdue" : ""}{activity.previousDue ? ` · was ${activity.previousDue}` : ""}</td>
                  <td>{activity.status}</td>
                  <td>
                    {!closed && !locked && (
                      <div className="row-actions">
                        <input aria-label={`Remarks for ${activity.subject}`} value={notes[activity.id] ?? ""} placeholder="Remarks" onChange={(event) => setNotes((current) => ({ ...current, [activity.id]: event.target.value }))} />
                        {activity.status === "Pending" && <Button type="button" onClick={() => move(activity.id, "start", "")}>Start</Button>}
                        <Button type="button" onClick={() => move(activity.id, "complete", notes[activity.id] ?? "")}>Complete</Button>
                        <Button type="button" onClick={() => move(activity.id, "cancel", notes[activity.id] ?? "")}>Cancel</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {activities.length === 0 && (
              <tr>
                <td colSpan={6}>No activities on this service.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        {!locked && <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Add activity</Button>}
      </FormDialog>
      <FormDialog open={deliveryOpen} title="Edit loan delivery" submitLabel="Save" size="small" onClose={() => setDeliveryOpen(false)} onSubmit={saveDelivery}>
        {deliveryError && <p className="err">{deliveryError}</p>}
      <div className="fields">
        <Field label="Bank delivered" required>
          <select value={bank} disabled={locked} onChange={(event) => setBank(event.target.value)}>
            {BANKS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        {bank === "Other" && (
          <Field label="Other bank name" required>
            <input value={otherBank} disabled={locked} onChange={(event) => setOtherBank(event.target.value)} />
          </Field>
        )}
        <Field label="Loan type" required>
          <select value={loanType} disabled={locked} onChange={(event) => setLoanType(event.target.value)}>
            {LOAN_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Delivery date" required>
          <input type="date" value={date} disabled={locked} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Delivery value" required>
          <input value={value} disabled={locked} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Remarks">
          <input value={deliveryRemarks} disabled={locked} onChange={(event) => setDeliveryRemarks(event.target.value)} />
        </Field>
      </div>
      </FormDialog>
      <FormDialog open={open} title="Add activity" submitLabel="Save activity" wide onClose={() => setOpen(false)} onSubmit={saveActivity}>
        <div className="fields">
          <Field label="Activity type" required>
            <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ServiceActivity["type"] })}>
              <option>Task</option>
              <option>Follow-up</option>
              <option>Call</option>
              <option>Meeting</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Subject" required>
            <input maxLength={200} value={draft.subject ?? ""} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          </Field>
          <Field label="Assigned to" required>
            <select value={draft.assigneeId} onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })}>
              {state.users.filter((item) => item.status === "Active").map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date" required={draft.type === "Task" || draft.type === "Follow-up"}>
            <input type="date" value={draft.due ?? ""} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
          </Field>
          <Field label="Description">
            <textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Field>
          <Field label="Communication with">
            <select value={draft.communicationWith ?? ""} onChange={(event) => setDraft({ ...draft, communicationWith: (event.target.value || undefined) as ServiceActivity["communicationWith"] })}>
              <option value="">None</option>
              <option>Customer</option>
              <option>Bank</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Contact or institution">
            <input value={draft.contact ?? ""} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} />
          </Field>
          <Field label="Communication notes">
            <textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
        </div>
      </FormDialog>
    </div>
  ) : (
    <div className="svc-edit">
      {instance.assessmentRequired && (
        <div className="fields">
          <Field label="Financial period" required>
            <select value={instance.financialPeriodId ?? periodId} disabled={instance.assessmentStatus === "Finalized" || locked || periods.length === 0} onChange={(event) => setPeriodId(event.target.value)}>
              {periods.length === 0 && <option value="">Add a turnover period on the customer first</option>}
              {periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.from} to {item.to}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Financial summary">
            <p className="hint">
              {summary
                ? `${summary.from} to ${summary.to}. Sales ${aed(summary.sales)}, POS ${aed(summary.pos)}, bank ${aed(summary.bank)}. Source ${summary.source}.`
                : "No verified turnover period is available."}
            </p>
          </Field>
          <Field label="Assessment result" required>
            <select value={result} disabled={instance.assessmentStatus === "Finalized" || locked} onChange={(event) => setResult(event.target.value as AssessmentResult)}>
              <option>Satisfactory</option>
              <option>Requires Clarification</option>
              <option>Not Satisfactory</option>
            </select>
          </Field>
          <Field label="Assessment remarks" required>
            <textarea value={remarks} disabled={instance.assessmentStatus === "Finalized" || locked} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
          {assessmentOpen && (
            <div className="row-actions">
              <Button type="button" onClick={finalize}>Finalize assessment</Button>
            </div>
          )}
          {instance.assessmentStatus === "Finalized" && (
            <p className="hint">
              Reviewed by {userName(state, instance.reviewedBy)} {instance.reviewedAt ? `on ${instance.reviewedAt.slice(0, 10)}` : ""}. The snapshot stays with this service.
            </p>
          )}
        </div>
      )}
      {!instance.assessmentRequired && <p className="hint">Financial assessment is not enabled for this service.</p>}
    </div>
  );
}
