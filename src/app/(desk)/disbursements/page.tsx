"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, DataTable } from "@/components/ui";
import { applicationView, userName } from "@/lib/access";
import { aed, formatDate, formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function DisbursementsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.deliveries.filter((row) => {
      const { application, customer, owner } = applicationView(state, row.applicationId);
      const blob = `${application?.number ?? ""} ${customer?.name ?? ""} ${customer?.code ?? ""} ${row.bank} ${owner?.name ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Applications">
      <div className="page">
        <PageHeader title="Disbursements" lede="Partial deliveries stay as separate records. This desk does not call a bank payment service." />
        <div className="filters">
          <input placeholder="Search application, company, or bank" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search disbursements" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Application</th>
              <th>Company</th>
              <th>Owner / signatory</th>
              <th>Bank</th>
              <th>Loan type</th>
              <th>Delivery date</th>
              <th>Value</th>
              <th>Offer letter</th>
              <th>Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer, owner } = applicationView(state, row.applicationId);
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/applications/${row.applicationId}/delivery`}>
                      {application?.number ?? "None"}
                    </Link>
                  </td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{customer?.folderRef}</div>
                  </td>
                  <td>{owner?.name ?? "None"}</td>
                  <td>{row.bank}</td>
                  <td>{row.loanType}</td>
                  <td>{formatDate(row.date)}</td>
                  <td className="num">{aed(row.amount)}</td>
                  <td>{row.offerNote || "None"}</td>
                  <td>
                    {userName(state, row.recordedBy)}
                    <div className="hint">{formatWhen(row.recordedAt)}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>No disbursements match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
