"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView, userName } from "@/lib/access";
import { aed, formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function ClosuresPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.applications.filter((app) => {
      const { customer } = applicationView(state, app.id);
      const blob = `${app.number} ${customer?.name ?? ""} ${customer?.code ?? ""} ${app.status}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader title="Application closure" lede="A file closes with one outcome. Delivered amount is the sum of the disbursement records." />
        <div className="filters">
          <input placeholder="Search application or company" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search closures" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Application</th>
              <th>Customer</th>
              <th>Outcome</th>
              <th>Approved</th>
              <th>Delivered</th>
              <th>Closure date</th>
              <th>Reason</th>
              <th>Closed by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => {
              const { customer } = applicationView(state, app.id);
              const closure = state.closures.find((item) => item.applicationId === app.id);
              const banks = state.submissions.filter((item) => item.applicationId === app.id).map((item) => item.bank);
              return (
                <tr key={app.id}>
                  <td>
                    <Link className="link" href={`/applications/${app.id}/close`}>
                      {app.number}
                    </Link>
                  </td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{banks.join(", ") || "No bank"}</div>
                  </td>
                  <td>{closure ? <StatusText value={closure.outcome} /> : app.status}</td>
                  <td className="num">{aed(closure?.approvedAmount)}</td>
                  <td className="num">{aed(closure?.deliveredAmount)}</td>
                  <td>{formatWhen(closure?.closedAt)}</td>
                  <td>{closure?.reason || closure?.remarks || "Still open"}</td>
                  <td>{closure ? userName(state, closure.closedBy) : "None"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>No applications match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
