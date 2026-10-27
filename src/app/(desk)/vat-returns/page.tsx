"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, DataTable } from "@/components/ui";
import { aed } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function VatReturnsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.flatMap((customer) => {
      const periods = customer.vatReturns.length > 0 ? customer.vatReturns : [null];
      return periods.map((row) => ({ customer, row }));
    }).filter(({ customer, row }) => {
      const blob = `${customer.name} ${customer.code} ${row?.status ?? ""} ${row?.attachment ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status === "None") return !row;
      if (status !== "All" && row?.status !== status) return false;
      return true;
    });
  }, [state, q, status]);

  if (!state) return null;
  const statuses = [...new Set(state.customers.flatMap((customer) => customer.vatReturns.map((row) => row.status)))];

  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader
          title="VAT returns"
          lede="Every VAT period recorded on a company profile. Open the company to add or change a period."
        />
        <div className="filters">
          <input placeholder="Search company, code, or status" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search VAT returns" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="VAT status">
            <option>All</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option value="None">No period recorded</option>
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Customer code</th>
              <th>Company</th>
              <th>Certificate</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Attachment</th>
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
                <td>{customer.vatCertificate}</td>
                <td>{row ? `${row.from} to ${row.to}` : "No period recorded"}</td>
                <td className="num">{row ? aed(row.amount) : "None"}</td>
                <td>{row?.status ?? "None"}</td>
                <td>{row?.attachment || "None"}</td>
                <td>{row?.remarks || "None"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>No VAT returns match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
