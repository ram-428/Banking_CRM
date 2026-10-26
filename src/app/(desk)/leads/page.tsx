"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateLeadDialog } from "@/components/create-lead-dialog";
import { Button, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function LeadsPage() {
  const { state } = useDesk();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [owner, setOwner] = useState("All");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("vrw-open-create") !== "lead") return;
    sessionStorage.removeItem("vrw-open-create");
    setAdding(true);
  }, []);
  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.filter((customer) => {
      const blob = `${customer.name} ${customer.code} ${customer.contacts.map((c) => c.name).join(" ")}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All" && customer.leadStatus !== status) return false;
      if (owner !== "All" && customer.assignedTo !== owner) return false;
      return true;
    });
  }, [state, q, status, owner]);

  if (!state) return null;

  return (
    <Gate module="Leads">
      <div className="page">
        <PageHeader
          title="Leads"
          lede="Each company keeps one master profile. A shared contact does not create a second company."
        />
        <div className="filters">
          <input placeholder="Search company, code, or contact" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search leads" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lead status">
            <option>All</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Sales executive">
            <option value="All">All sales</option>
            {state.users
              .filter((user) => user.role === "Sales")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
          {can(state, "Leads", "create") && (
            <Button type="button" className="push" onClick={() => setAdding(true)}>
              + Create lead
            </Button>
          )}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Service</th>
              <th>Sales</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => {
              const contact = customer.contacts[0];
              return (
                <tr key={customer.id}>
                  <td>
                    <Link className="link" href={`/customers/${customer.code}`}>
                      {customer.name}
                    </Link>
                    <div className="hint">{customer.code}</div>
                  </td>
                  <td>
                    {contact?.name}
                    <div className="hint">
                      {contact?.mobile}
                      <br />
                      {contact?.email}
                    </div>
                  </td>
                  <td>{customer.service}</td>
                  <td>{userName(state, customer.assignedTo)}</td>
                  <td>
                    <StatusText value={customer.leadStatus} />
                  </td>
                  <td>{formatDate(customer.updatedAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No leads match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        <CreateLeadDialog
          open={adding}
          onClose={() => setAdding(false)}
          onCreated={(code) => {
            setAdding(false);
            router.push(`/customers/${code}`);
          }}
        />
      </div>
    </Gate>
  );
}
