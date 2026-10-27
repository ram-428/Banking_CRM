"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { aed } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function StatementsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.filter((customer) => {
      const blob = `${customer.name} ${customer.code} ${customer.statement?.bank ?? ""} ${customer.statement?.account ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader
          title="Bank statement analysis"
          lede="Credits, debits, balances, and missing months are simulated from the demo statement. They are not extracted from a live file."
        />
        <div className="filters">
          <input placeholder="Search company, code, or bank" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search statements" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Company</th>
              <th>Period</th>
              <th>Bank / account</th>
              <th>Credits</th>
              <th>Debits</th>
              <th>Average balance</th>
              <th>Turnover</th>
              <th>Missing months</th>
              <th>Flags</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => {
              const statement = customer.statement;
              const gaps = statement?.months.filter((month) => !month.covered).map((month) => month.label) ?? [];
              return (
                <tr key={customer.id}>
                  <td>
                    <Link className="link" href={`/financials/${customer.code}`}>
                      {customer.name}
                    </Link>
                    <div className="hint">{customer.code}</div>
                  </td>
                  <td>{statement ? `${statement.window} · ${statement.from} to ${statement.to}` : "No statement"}</td>
                  <td>{statement ? `${statement.bank} · ${statement.account}` : "None"}</td>
                  <td className="num">{aed(statement?.credits)}</td>
                  <td className="num">{aed(statement?.debits)}</td>
                  <td className="num">{aed(statement?.averageBalance)}</td>
                  <td className="num">{aed(statement?.turnover)}</td>
                  <td>{gaps.length ? gaps.join(", ") : statement ? "None" : "None"}</td>
                  <td>{statement?.flags.length ? statement.flags.join("; ") : "None"}</td>
                  <td>{statement ? <StatusText value={statement.status} /> : "Not started"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No statements match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
