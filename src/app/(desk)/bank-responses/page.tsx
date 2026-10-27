"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView } from "@/lib/access";
import { aed, formatDate } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function BankResponsesPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.submissions.filter((row) => {
      const { application, customer } = applicationView(state, row.applicationId);
      const blob = `${row.reference} ${row.bank} ${row.responseStatus ?? ""} ${application?.number ?? ""} ${customer?.name ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Banks">
      <div className="page">
        <PageHeader title="Bank responses" lede="Approval, rejection, and extra document requests stay on the submission, not on the whole application." />
        <div className="filters">
          <input placeholder="Search bank, reference, or company" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search bank responses" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Bank</th>
              <th>Response date</th>
              <th>Response</th>
              <th>Approved amount</th>
              <th>Rate</th>
              <th>Tenure</th>
              <th>EMI</th>
              <th>Offer / extra documents</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link className="link" href={`/applications/${row.applicationId}/banks`}>
                    {row.reference}
                  </Link>
                </td>
                <td>{row.bank}</td>
                <td>{formatDate(row.responseDate)}</td>
                <td>{row.responseStatus ? <StatusText value={row.responseStatus} /> : "No response yet"}</td>
                <td className="num">{aed(row.approvedAmount)}</td>
                <td>{row.rate != null ? `${row.rate}%` : "None"}</td>
                <td>{row.tenure != null ? `${row.tenure} months` : "None"}</td>
                <td className="num">{aed(row.emi)}</td>
                <td>
                  {row.offerNote || "No offer letter"}
                  <div className="hint">{row.additionalRequest || "No extra document request"}</div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>No bank responses match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
