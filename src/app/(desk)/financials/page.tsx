"use client";

import Link from "next/link";
import { Gate, PageHeader, StatusText } from "@/components/ui";
import { aed } from "@/lib/format";
import { profileSections } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function FinancialListPage() {
  const { state } = useDesk();
  if (!state) return null;
  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader title="Financial profiles" lede="Company figures live once. Applications keep the snapshot they were assessed against." />
        <table className="data">
          <thead>
            <tr>
              <th>Company</th>
              <th>Profile</th>
              <th>Sections</th>
              <th>Sales turnover</th>
              <th>Statements</th>
            </tr>
          </thead>
          <tbody>
            {state.customers.map((customer) => {
              const sections = profileSections(customer);
              return (
                <tr key={customer.id}>
                  <td>
                    <Link className="link" href={`/financials/${customer.code}`}>
                      {customer.name}
                    </Link>
                    <div className="hint">{customer.code}</div>
                  </td>
                  <td>
                    <StatusText value={customer.profileStatus} />
                  </td>
                  <td>
                    {sections.ready} of {sections.total}
                  </td>
                  <td className="num">{aed(customer.salesTurnover)}</td>
                  <td>{customer.statement?.status ?? "No statement set"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Gate>
  );
}
