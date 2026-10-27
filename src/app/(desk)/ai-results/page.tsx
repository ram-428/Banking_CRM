"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView } from "@/lib/access";
import { useDesk } from "@/lib/store";

export default function AiResultsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.versions.filter((row) => {
      if (!row.ai) return false;
      const { application, customer } = applicationView(state, row.applicationId);
      const blob = `${row.fileName} ${row.ai.documentType} ${row.ai.companyName} ${customer?.name ?? ""} ${application?.number ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Verification">
      <div className="page">
        <PageHeader title="AI results" lede="Demo extraction only. A reviewer decision is recorded separately and is not taken from these findings." />
        <div className="filters">
          <input placeholder="Search company, file, or document type" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search AI results" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>File</th>
              <th>Company</th>
              <th>AI document type</th>
              <th>Extracted name</th>
              <th>Number</th>
              <th>Issue / expiry</th>
              <th>Profile match</th>
              <th>Confidence</th>
              <th>Processing</th>
              <th>Reviewer decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer } = applicationView(state, row.applicationId);
              const ai = row.ai!;
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/verification/${row.id}`}>
                      {row.fileName}
                    </Link>
                    <div className="hint">
                      {application?.number} · v{row.version}
                    </div>
                  </td>
                  <td>{customer?.name ?? "None"}</td>
                  <td>{ai.documentType}</td>
                  <td>{ai.companyName}</td>
                  <td>{ai.documentNumber}</td>
                  <td>
                    {ai.issueDate || "None"}
                    <div className="hint">{ai.expiryDate || "No expiry"}</div>
                  </td>
                  <td>{ai.match}</td>
                  <td>{ai.confidence}%</td>
                  <td>
                    <StatusText value={ai.processing} />
                    <div className="hint">{ai.findings[0] || "No finding"}</div>
                  </td>
                  <td>{row.status}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No demo AI results match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
