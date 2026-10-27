"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView } from "@/lib/access";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function AgreementsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.agreements.filter((row) => {
      const { application, customer } = applicationView(state, row.applicationId);
      const blob = `${row.type} ${row.documentName} ${row.envelopeId ?? ""} ${application?.number ?? ""} ${customer?.name ?? ""} ${row.recipientNames.join(" ")}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Banks">
      <div className="page">
        <PageHeader title="Agreement tracking" lede="DocuSign is a placeholder. Sent, viewed, and signed states are updated on this desk and are not received from a provider." />
        <div className="filters">
          <input placeholder="Search application, company, or envelope" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search agreements" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Application</th>
              <th>Company</th>
              <th>Type</th>
              <th>Document</th>
              <th>Provider</th>
              <th>Signatories</th>
              <th>Sent</th>
              <th>Signed</th>
              <th>Status</th>
              <th>Envelope</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer } = applicationView(state, row.applicationId);
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/applications/${row.applicationId}/agreement`}>
                      {application?.number ?? "None"}
                    </Link>
                  </td>
                  <td>{customer?.name ?? "None"}</td>
                  <td>{row.type}</td>
                  <td>{row.documentName}</td>
                  <td>{row.provider}</td>
                  <td>{row.recipientNames.join(", ") || "None"}</td>
                  <td>{formatWhen(row.sentAt)}</td>
                  <td>{formatWhen(row.signedAt)}</td>
                  <td>
                    <StatusText value={row.status} />
                  </td>
                  <td>
                    {row.envelopeId || "None"}
                    <div className="hint">{row.error || row.remarks || "No error"}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No agreements match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
