"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, DataTable, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { createServiceRequest } from "@/lib/actions";
import { parentRequestStatus, serviceCounts } from "@/lib/request-status";
import { useDesk } from "@/lib/store";

export default function ServiceRequestsPage() {
  const { state, replace, user } = useDesk();
  const router = useRouter();
  const params = useSearchParams();
  const presetCustomer = params.get("customer") ?? "";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(Boolean(presetCustomer));
  const [customerId, setCustomerId] = useState(presetCustomer);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High">("Normal");
  const [remarks, setRemarks] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    if (!state) return [];
    return state.serviceRequests.filter((request) => {
      const customer = state.customers.find((item) => item.id === request.customerId);
      const blob = `${request.number} ${customer?.name ?? ""} ${customer?.code ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state || !user) return null;
  const activeServices = state.services.filter((item) => item.status === "Active");
  const staff = state.users.filter((item) => item.status === "Active");

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function save() {
    const result = createServiceRequest(
      state!,
      { customerId, serviceIds: selected, assigneeId: assigneeId || user!.id, priority, remarks },
      user!,
    );
    if (result.error || !result.id) {
      setError(result.error ?? "The request could not be created.");
      return;
    }
    replace(result.state);
    setOpen(false);
    router.push(`/service-requests/${result.id}`);
  }

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader title="Service request list" lede="Each request keeps its own service instances. The parent status is calculated from those instances." />
        <div className="filters">
          <input placeholder="Search request number or customer" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search service requests" />
          {can(state, "Applications", "create") && (
            <Button type="button" className="push" onClick={() => setOpen(true)}>
              + Create service request
            </Button>
          )}
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Request number</th>
              <th>Customer</th>
              <th>Request date</th>
              <th>Assigned employee</th>
              <th>Priority</th>
              <th>Services</th>
              <th>Parent status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((request) => {
              const customer = state.customers.find((item) => item.id === request.customerId);
              const instances = state.serviceInstances.filter((item) => item.requestId === request.id);
              const counts = serviceCounts(instances);
              return (
                <tr key={request.id}>
                  <td>
                    <Link className="link" href={`/service-requests/${request.id}`}>
                      {request.number}
                    </Link>
                  </td>
                  <td>
                    {customer?.name ?? "Unknown customer"}
                    <div className="hint">{customer?.code}</div>
                  </td>
                  <td>{request.requestDate}</td>
                  <td>{userName(state, request.assigneeId)}</td>
                  <td>{request.priority}</td>
                  <td>
                    {instances.length}
                    <div className="hint">
                      {counts.pending} collecting · {counts.processing} processing · {counts.hold} on hold · {counts.completed} completed
                    </div>
                  </td>
                  <td>
                    <StatusText value={parentRequestStatus(instances)} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>No service requests match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <FormDialog
          open={open}
          title="Create service request"
          description="Customer details come from the customer record. Select one or more active services. The same service cannot be added twice."
          submitLabel="Create request"
          wide
          onClose={() => setOpen(false)}
          onSubmit={save}
        >
          <div className="fields">
            <Field label="Customer" required error={error}>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Select a customer</option>
                {state.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code} · {customer.name}
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
              <textarea value={remarks} maxLength={1000} onChange={(event) => setRemarks(event.target.value)} placeholder="What the customer needs from the selected services" />
            </Field>
          </div>
          <div className="fields" style={{ marginTop: 12 }}>
            {activeServices.map((service) => (
              <label key={service.id} className="field">
                <span>
                  <input type="checkbox" checked={selected.includes(service.id)} onChange={() => toggle(service.id)} /> {service.name}
                </span>
                <small className="hint">{service.financialAssessment ? "Financial assessment required" : "No financial assessment"}</small>
              </label>
            ))}
            {activeServices.length === 0 && <p className="hint">Add an active service in Service master before creating a request.</p>}
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
