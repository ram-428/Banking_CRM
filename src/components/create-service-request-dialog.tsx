"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Field } from "@/components/ui";
import { createServiceRequest, sendServiceInvitation } from "@/lib/actions";
import type { State, User } from "@/lib/types";

export function CreateServiceRequestDialog({
  open,
  state,
  user,
  customerId: presetCustomerId = "",
  lockCustomer,
  onClose,
  onCreated,
}: {
  open: boolean;
  state: State;
  user: User;
  customerId?: string;
  lockCustomer?: boolean;
  onClose: () => void;
  onCreated: (next: State, requestId: string) => void;
}) {
  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High">("Normal");
  const [remarks, setRemarks] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [invite, setInvite] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const customer = state.customers.find((item) => item.id === presetCustomerId);
    setCustomerId(presetCustomerId);
    setAssigneeId(customer?.assignedTo ?? "");
    setPriority("Normal");
    setRemarks("");
    setSelected([]);
    setInvite(true);
    setError("");
  }, [open, presetCustomerId, state.customers]);

  const activeServices = state.services.filter((item) => item.status === "Active");
  const staff = state.users.filter((item) => item.status === "Active");
  const customer = state.customers.find((item) => item.id === customerId);
  const hasPortalContact = Boolean(customer?.contacts.some((item) => item.email));

  function save() {
    const result = createServiceRequest(state, { customerId, serviceIds: selected, assigneeId: assigneeId || user.id, priority, remarks }, user);
    if (result.error || !result.id) {
      setError(result.error ?? "The request could not be created.");
      return;
    }
    let next = result.state;
    if (invite && hasPortalContact) {
      const invited = sendServiceInvitation(next, result.id, user);
      if (!invited.error) next = invited.state;
    }
    onCreated(next, result.id);
  }

  return (
    <FormDialog
      open={open}
      title="Create service request"
      description="Customer details come from the customer record. Select one active service. Create a separate request for each additional service."
      submitLabel="Create request"
      wide
      onClose={onClose}
      onSubmit={save}
    >
      <div className="fields">
        <Field label="Customer" required error={error}>
          <select value={customerId} disabled={lockCustomer} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Select a customer</option>
            {state.customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigned employee" required>
          <select value={assigneeId || user.id} onChange={(event) => setAssigneeId(event.target.value)}>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" required>
          <select value={priority} onChange={(event) => setPriority(event.target.value as "Normal" | "High")}>
            <option>Normal</option>
            <option>High</option>
          </select>
        </Field>
        <Field label="Service requirements">
          <textarea value={remarks} maxLength={1000} onChange={(event) => setRemarks(event.target.value)} placeholder="What the customer needs from the selected service" />
        </Field>
      </div>
      <div className="check-toolbar-title">
        <strong>Service</strong>
        <span className="hint">Choose one service per request.</span>
      </div>
      <div className="fields" style={{ marginTop: 8 }}>
        {activeServices.map((service) => (
          <label key={service.id} className="field">
            <span>
              <input type="radio" name="service" checked={selected.includes(service.id)} onChange={() => setSelected([service.id])} /> {service.name}
            </span>
            <small className="hint">
              {service.documentCodes.length} documents · {service.financialAssessment ? "financial assessment required" : "no financial assessment"}
            </small>
          </label>
        ))}
        {activeServices.length === 0 && <p className="hint">Add an active service in Service master before creating a request.</p>}
      </div>
      <label className="field" style={{ marginTop: 12 }}>
        <span>
          <input type="checkbox" checked={invite && hasPortalContact} disabled={!hasPortalContact} onChange={(event) => setInvite(event.target.checked)} /> Send the customer portal invitation now
        </span>
        <small className="hint">
          {hasPortalContact ? "The customer sees this request on the portal with its document checklist." : "Add a contact email on the customer record to invite them to the portal."}
        </small>
      </label>
    </FormDialog>
  );
}
