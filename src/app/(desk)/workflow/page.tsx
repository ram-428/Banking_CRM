"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView, userName } from "@/lib/access";
import { STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

function daysInStage(started: string) {
  const start = new Date(started);
  if (Number.isNaN(start.getTime())) return "None";
  return String(Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)));
}

export default function WorkflowPage() {
  const { state } = useDesk();
  const [stage, setStage] = useState("All");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.applications.filter((app) => {
      const { customer } = applicationView(state, app.id);
      const blob = `${app.number} ${customer?.name ?? ""} ${customer?.code ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (stage !== "All" && app.currentStage !== stage) return false;
      return true;
    });
  }, [state, q, stage]);

  if (!state) return null;

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader title="Workflow dashboard" lede="Lead qualification through closure. Bank status stays separate from the stage on the file." />
        <div className="filters">
          <input placeholder="Search application or company" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search workflow" />
          <select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Workflow stage">
            <option>All</option>
            {STAGES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Application</th>
              <th>Company</th>
              <th>Stage</th>
              <th>Stage status</th>
              <th>Assigned</th>
              <th>Started</th>
              <th>Expected</th>
              <th>Days</th>
              <th>Pending</th>
              <th>Documents</th>
              <th>Overall / banks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => {
              const { customer } = applicationView(state, app.id);
              const assignee = state.users.find((user) => user.id === app.assignedTo);
              const required = state.checklist.filter((item) => item.applicationId === app.id && item.requirement === "Mandatory");
              const approved = required.filter((item) => item.status === "Approved").length;
              const banks = state.submissions.filter((item) => item.applicationId === app.id);
              return (
                <tr key={app.id}>
                  <td>
                    <Link className="link" href={`/applications/${app.id}`}>
                      {app.number}
                    </Link>
                  </td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{customer?.code}</div>
                  </td>
                  <td>{app.currentStage}</td>
                  <td>
                    <StatusText value={app.stageStatus} />
                    {isOverdue(app) && <div className="hint">Overdue</div>}
                  </td>
                  <td>
                    {userName(state, app.assignedTo)}
                    <div className="hint">{assignee?.department ?? "Unassigned"}</div>
                  </td>
                  <td>{formatDate(app.stageStarted)}</td>
                  <td>{formatDate(app.expectedCompletion)}</td>
                  <td>{daysInStage(app.stageStarted)}</td>
                  <td>
                    {app.pendingWith || "None"}
                    <div className="hint">{app.pendingReason || "No pending reason"}</div>
                  </td>
                  <td>
                    {approved} of {required.length} approved
                  </td>
                  <td>
                    {app.status}
                    <div className="hint">{banks.length ? banks.map((item) => `${item.bank}: ${item.status}`).join("; ") : "No bank yet"}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11}>No applications match this stage.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
