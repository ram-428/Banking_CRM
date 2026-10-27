"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, DataTable } from "@/components/ui";
import { aed } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function AuditReportsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const [available, setAvailable] = useState("All");

  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.flatMap((customer) => {
      const years = customer.audits.length > 0 ? customer.audits : [null];
      return years.map((row) => ({ customer, row }));
    }).filter(({ customer, row }) => {
      const blob = `${customer.name} ${customer.code} ${row?.year ?? ""} ${row?.firm ?? ""} ${row?.attachment ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (available !== "All" && customer.auditAvailable !== available) return false;
      return true;
    });
  }, [state, q, available]);

  if (!state) return null;

  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader
          title="Audit reports"
          lede="Every audit year recorded on a company profile. Open the company to add or change a year."
        />
        <div className="filters">
          <input placeholder="Search company, code, year, or firm" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search audit reports" />
          <select value={available} onChange={(event) => setAvailable(event.target.value)} aria-label="Audit available">
            <option>All</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Customer code</th>
              <th>Company</th>
              <th>Available</th>
              <th>Year</th>
              <th>Firm</th>
              <th>Revenue</th>
              <th>Net profit</th>
              <th>Assets</th>
              <th>Liabilities</th>
              <th>Years</th>
              <th>Report</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ customer, row }) => (
              <tr key={row?.id ?? `${customer.id}-empty`}>
                <td>{customer.code}</td>
                <td>
                  <Link className="link" href={`/customers/${customer.code}`}>
                    {customer.name}
                  </Link>
                </td>
                <td>{customer.auditAvailable}</td>
                <td>{row?.year || "No year recorded"}</td>
                <td>{row?.firm || "Not named"}</td>
                <td className="num">{row ? aed(row.revenue) : "None"}</td>
                <td className="num">{row ? aed(row.profit) : "None"}</td>
                <td className="num">{row ? aed(row.assets) : "None"}</td>
                <td className="num">{row ? aed(row.liabilities) : "None"}</td>
                <td>{customer.audits.length || "None"}</td>
                <td>{row?.attachment || "None"}</td>
                <td>{row?.remarks || "None"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12}>No audit reports match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
