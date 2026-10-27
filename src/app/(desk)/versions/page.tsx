"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView, userName } from "@/lib/access";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function VersionHistoryPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.versions.filter((row) => {
      const { application, customer } = applicationView(state, row.applicationId);
      const item = state.checklist.find((entry) => entry.id === row.checklistItemId);
      const blob = `${row.fileName} ${item?.name ?? ""} ${customer?.code ?? ""} ${application?.number ?? ""} ${row.status}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Verification">
      <div className="page">
        <PageHeader title="Version history" lede="Earlier uploads stay on the file. A rejection opens a resubmission and does not delete the previous version." />
        <div className="filters">
          <input placeholder="Search file, company, or application" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search versions" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Version</th>
              <th>Document</th>
              <th>Company</th>
              <th>Application</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Reviewer</th>
              <th>Rejection / comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer } = applicationView(state, row.applicationId);
              const item = state.checklist.find((entry) => entry.id === row.checklistItemId);
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/verification/${row.id}`}>
                      v{row.version}
                    </Link>
                    <div className="hint">{row.fileName}</div>
                  </td>
                  <td>{item?.name ?? "Document"}</td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{customer?.code}</div>
                  </td>
                  <td>{application?.number ?? "None"}</td>
                  <td>
                    {userName(state, row.uploadedBy)}
                    <div className="hint">{formatWhen(row.uploadedAt)}</div>
                  </td>
                  <td>
                    <StatusText value={row.status} />
                  </td>
                  <td>
                    {row.reviewerId ? userName(state, row.reviewerId) : "Unassigned"}
                    <div className="hint">{formatWhen(row.reviewedAt)}</div>
                  </td>
                  <td>{row.rejectionReason || row.comments || "None"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>No document versions match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
