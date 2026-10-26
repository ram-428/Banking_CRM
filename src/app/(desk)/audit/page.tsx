"use client";

import { useMemo, useState } from "react";
import { Gate, PageHeader } from "@/components/ui";
import { userName } from "@/lib/access";
import { aed } from "@/lib/format";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function AuditPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const [module, setModule] = useState("All");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.audit.filter((event) => {
      if (module !== "All" && event.module !== module) return false;
      const blob = `${event.action} ${event.record} ${event.detail ?? ""} ${userName(state, event.actorId)}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q, module]);
  if (!state) return null;
  const modules = [...new Set(state.audit.map((event) => event.module))];
  const disbursed = state.deliveries.reduce((sum, row) => sum + row.amount, 0);
  const open = state.applications.filter((app) => !["Closed", "Rejected", "Withdrawn"].includes(app.status)).length;

  return (
    <Gate module="Audit">
      <div className="page">
        <PageHeader title="Audit history" lede="Significant customer, document, bank, agreement, task, and closure actions are kept." />
        <dl className="facts" style={{ marginBottom: 22 }}>
          <div>
            <dt>Open applications</dt>
            <dd>{open}</dd>
          </div>
          <div>
            <dt>Disbursed on file</dt>
            <dd>{aed(disbursed)}</dd>
          </div>
          <div>
            <dt>Recorded actions</dt>
            <dd>{state.audit.length}</dd>
          </div>
        </dl>
        <div className="filters">
          <input aria-label="Search audit" placeholder="Action, record, or person" value={q} onChange={(event) => setQ(event.target.value)} />
          <select aria-label="Module" value={module} onChange={(event) => setModule(event.target.value)}>
            <option>All</option>
            {modules.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Module</th>
              <th>Record</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id}>
                <td>{formatWhen(event.at)}</td>
                <td>
                  {userName(state, event.actorId)}
                  <div className="hint">{state.users.find((item) => item.id === event.actorId)?.role}</div>
                </td>
                <td>{event.action}</td>
                <td>{event.module}</td>
                <td>{event.record}</td>
                <td>
                  {event.previous && event.next ? `${event.previous} → ${event.next}` : event.detail}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No audit rows match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Gate>
  );
}
