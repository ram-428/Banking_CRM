"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { formatWhen } from "@/lib/format";
import { profileSections } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function CustomerProfilesPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.filter((customer) => {
      const blob = `${customer.code} ${customer.name} ${customer.tradeLicense}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All" && customer.profileStatus !== status) return false;
      return true;
    });
  }, [state, q, status]);

  if (!state) return null;
  const statuses = [...new Set(state.customers.map((customer) => customer.profileStatus))];

  return (
    <Gate module="Leads">
      <div className="page">
        <PageHeader title="Customer profiles" lede="Company, compliance, banking, and financial records for every customer code." />
        <div className="filters">
          <input placeholder="Search company or code" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search customer profiles" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Profile status">
            <option>All</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Customer code</th>
              <th>Company</th>
              <th>Profile</th>
              <th>Completion</th>
              <th>Lead status</th>
              <th>Sales executive</th>
              <th>Last modified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => {
              const sections = profileSections(customer);
              return (
                <tr key={customer.id}>
                  <td>{customer.code}</td>
                  <td>
                    <Link className="link" href={`/customers/${customer.code}`}>
                      {customer.name}
                    </Link>
                  </td>
                  <td>
                    <StatusText value={customer.profileStatus} />
                  </td>
                  <td>{Math.round((sections.ready / sections.total) * 100)}%</td>
                  <td>{customer.leadStatus}</td>
                  <td>{userName(state, customer.assignedTo)}</td>
                  <td>
                    {formatWhen(customer.updatedAt)}
                    <div className="hint">{userName(state, customer.updatedBy)}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>No customer profiles match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
