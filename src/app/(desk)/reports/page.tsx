"use client";

import { useSearchParams } from "next/navigation";
import { DataTable, Gate, PageHeader } from "@/components/ui";
import { userName } from "@/lib/access";
import { useDesk } from "@/lib/store";

const TYPES = {
  leads: { title: "Lead reports", lede: "Leads by status and by source." },
  services: { title: "Service reports", lede: "Service requests and service instances by status and by service." },
  documents: { title: "Document reports", lede: "Checklist documents by status across all services." },
  performance: { title: "Performance reports", lede: "Customers, service instances and activities by assigned employee." },
} as const;

function tally<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function Count({ title, label, rows }: { title: string; label: string; rows: [string, number][] }) {
  return (
    <section className="panel" style={{ marginBottom: 14 }}>
      <h2>{title}</h2>
      <DataTable>
        <thead>
          <tr>
            <th>{label}</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, count]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{count}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2}>No records.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </section>
  );
}

export default function ReportsPage() {
  const { state } = useDesk();
  const params = useSearchParams();
  if (!state) return null;
  const raw = params.get("type") ?? "leads";
  const type = (raw in TYPES ? raw : "leads") as keyof typeof TYPES;
  const serviceName = (id: string) => state.services.find((item) => item.id === id)?.name ?? "Service";
  const checklist = state.serviceInstances.flatMap((instance) => instance.checklist);
  const people = state.users.filter((item) => item.status === "Active");

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader title={TYPES[type].title} lede={TYPES[type].lede} />
        {type === "leads" && (
          <>
            <Count title="By lead status" label="Status" rows={tally(state.customers, (item) => item.leadStatus)} />
            <Count title="By lead source" label="Source" rows={tally(state.customers, (item) => item.leadSource || "Not set")} />
          </>
        )}
        {type === "services" && (
          <>
            <Count title="Service instances by status" label="Status" rows={tally(state.serviceInstances, (item) => item.status)} />
            <Count title="Service instances by service" label="Service" rows={tally(state.serviceInstances, (item) => serviceName(item.serviceId))} />
            <Count title="Service requests by priority" label="Priority" rows={tally(state.serviceRequests, (item) => item.priority)} />
          </>
        )}
        {type === "documents" && (
          <>
            <Count title="Checklist documents by status" label="Status" rows={tally(checklist, (item) => item.status)} />
            <Count title="Checklist documents by document" label="Document" rows={tally(checklist, (item) => item.name)} />
          </>
        )}
        {type === "performance" && (
          <section className="panel">
            <h2>By employee</h2>
            <DataTable>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Customers</th>
                  <th>Service instances</th>
                  <th>Open activities</th>
                  <th>Completed activities</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td>{userName(state, person.id)}</td>
                    <td>{state.customers.filter((item) => item.assignedTo === person.id).length}</td>
                    <td>{state.serviceInstances.filter((item) => item.assigneeId === person.id).length}</td>
                    <td>{state.serviceActivities.filter((item) => item.assigneeId === person.id && item.status !== "Completed" && item.status !== "Cancelled").length}</td>
                    <td>{state.serviceActivities.filter((item) => item.assigneeId === person.id && item.status === "Completed").length}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </section>
        )}
      </div>
    </Gate>
  );
}
