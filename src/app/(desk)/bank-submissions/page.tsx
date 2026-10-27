"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView } from "@/lib/access";
import { aed, formatDate } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function BankSubmissionsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.submissions.filter((row) => {
      const { application, customer } = applicationView(state, row.applicationId);
      const blob = `${row.reference} ${row.bank} ${application?.number ?? ""} ${customer?.name ?? ""} ${customer?.code ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All" && row.status !== status) return false;
      return true;
    });
  }, [state, q, status]);

  if (!state) return null;

  return (
    <Gate module="Banks">
      <div className="page">
        <PageHeader title="Bank submissions" lede="Each bank is its own submission. The application keeps a separate overall status." />
        <div className="filters">
          <input placeholder="Search bank, reference, or company" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search bank submissions" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Submission status">
            <option>All</option>
            {["Draft", "Submitted", "Under Bank Review", "Additional Documents Required", "Approved", "Rejected", "Withdrawn"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Application</th>
              <th>Company</th>
              <th>Bank</th>
              <th>Branch / RM</th>
              <th>Submitted</th>
              <th>Amount</th>
              <th>Loan type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer } = applicationView(state, row.applicationId);
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/applications/${row.applicationId}/banks`}>
                      {row.reference}
                    </Link>
                  </td>
                  <td>{application?.number ?? "None"}</td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{customer?.code}</div>
                  </td>
                  <td>{row.bank}</td>
                  <td>
                    {row.branch || "None"}
                    <div className="hint">{row.manager || "No relationship manager"}</div>
                  </td>
                  <td>{formatDate(row.submittedOn)}</td>
                  <td className="num">{aed(row.amount)}</td>
                  <td>{row.loanType}</td>
                  <td>
                    <StatusText value={row.status} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>No bank submissions match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
