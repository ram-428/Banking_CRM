"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CreateServiceRequestDialog } from "@/components/create-service-request-dialog";
import { Button, DataTable, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { parentRequestStatus, serviceCounts } from "@/lib/request-status";
import { useDesk } from "@/lib/store";

export default function ServiceRequestsPage() {
  const { state, replace, user } = useDesk();
  const router = useRouter();
  const params = useSearchParams();
  const presetCustomer = params.get("customer") ?? "";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(Boolean(presetCustomer));

  const rows = useMemo(() => {
    if (!state) return [];
    return state.serviceRequests.filter((request) => {
      const customer = state.customers.find((item) => item.id === request.customerId);
      const blob = `${request.number} ${customer?.name ?? ""} ${customer?.code ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state || !user) return null;

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
        <CreateServiceRequestDialog
          open={open}
          state={state}
          user={user}
          customerId={presetCustomer}
          onClose={() => setOpen(false)}
          onCreated={(next, id) => {
            replace(next);
            setOpen(false);
            router.push(`/service-requests/${id}`);
          }}
        />
      </div>
    </Gate>
  );
}
