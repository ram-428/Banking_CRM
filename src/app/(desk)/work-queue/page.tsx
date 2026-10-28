"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, DataTable, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { progressServiceActivity } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { ServiceActivity } from "@/lib/types";

const FILTERS = ["My activities", "Pending", "In Progress", "Overdue", "Due today", "Completed"] as const;

function isOverdue(activity: ServiceActivity, today: string) {
  return Boolean(activity.due && activity.due < today && activity.status !== "Completed" && activity.status !== "Cancelled");
}

export default function WorkQueuePage() {
  const { state, replace, user } = useDesk();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("My activities");
  const [customerId, setCustomerId] = useState("All");
  const [serviceId, setServiceId] = useState("All");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    if (!state || !user) return [];
    return state.serviceActivities.filter((activity) => {
      if (activity.assigneeId !== user.id && filter !== "Completed") return activity.assigneeId === user.id;
      if (activity.assigneeId !== user.id) return false;
      const request = state.serviceRequests.find((item) => item.id === activity.requestId);
      const instance = state.serviceInstances.find((item) => item.id === activity.instanceId);
      if (customerId !== "All" && request?.customerId !== customerId) return false;
      if (serviceId !== "All" && instance?.serviceId !== serviceId) return false;
      if (filter === "Pending") return activity.status === "Pending";
      if (filter === "In Progress") return activity.status === "In Progress";
      if (filter === "Overdue") return isOverdue(activity, today);
      if (filter === "Due today") return activity.due === today && activity.status !== "Completed" && activity.status !== "Cancelled";
      if (filter === "Completed") return activity.status === "Completed";
      return activity.status !== "Completed" && activity.status !== "Cancelled";
    });
  }, [state, user, filter, customerId, serviceId, today]);

  if (!state || !user) return null;

  function complete(activity: ServiceActivity) {
    const outcome = progressServiceActivity(state!, activity.id, "complete", user!, notes[activity.id] ?? "");
    if (outcome.error) setError(outcome.error);
    else {
      setError("");
      replace(outcome.state);
    }
  }

  return (
    <Gate module="Tasks">
      <div className="page">
        <PageHeader title="My work queue" lede="Activities assigned to you on service requests. Overdue is calculated from the due date." actions={can(state, "Verification") ? <Link className="link" href="/verification">Document verification queue</Link> : undefined} />
        {error && <p className="err">{error}</p>}
        <div className="filters">
          <select aria-label="Activity filter" value={filter} onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number])}>
            {FILTERS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="All">All customers</option>
            {state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
          <select aria-label="Service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="All">All services</option>
            {state.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Activity subject</th>
              <th>Customer</th>
              <th>Request number</th>
              <th>Service</th>
              <th>Activity type</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((activity) => {
              const request = state.serviceRequests.find((item) => item.id === activity.requestId);
              const instance = state.serviceInstances.find((item) => item.id === activity.instanceId);
              const customer = state.customers.find((item) => item.id === request?.customerId);
              const service = state.services.find((item) => item.id === instance?.serviceId);
              const overdue = isOverdue(activity, today);
              return (
                <tr key={activity.id}>
                  <td>{activity.subject}</td>
                  <td>{customer?.name ?? "Unknown"}</td>
                  <td>{request ? <Link className="link" href={`/service-requests/${request.id}`}>{request.number}</Link> : activity.requestId}</td>
                  <td>{service?.name ?? "Service"}</td>
                  <td>{activity.type}</td>
                  <td>{activity.due || "None"}</td>
                  <td><StatusText value={overdue ? "Overdue" : activity.status} /></td>
                  <td>
                    {activity.status !== "Completed" && activity.status !== "Cancelled" && (
                      <div className="row-actions">
                        <input aria-label={`Remarks for ${activity.subject}`} value={notes[activity.id] ?? ""} placeholder="Completion remarks" onChange={(event) => setNotes((current) => ({ ...current, [activity.id]: event.target.value }))} />
                        <Button type="button" onClick={() => complete(activity)}>Complete</Button>
                      </div>
                    )}
                    <div className="hint">{userName(state, activity.assigneeId)}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>No activities match this filter.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
