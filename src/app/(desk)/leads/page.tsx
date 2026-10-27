"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateLeadDialog } from "@/components/create-lead-dialog";
import { Button, DataTable, Gate, PageHeader, RowAction, StatusText } from "@/components/ui";
import { can, primaryContact, userName } from "@/lib/access";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Customer } from "@/lib/types";

export default function LeadsPage() {
  const { state } = useDesk();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [owner, setOwner] = useState("All");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("vrw-open-create") !== "lead") return;
    sessionStorage.removeItem("vrw-open-create");
    setAdding(true);
  }, []);
  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers.filter((customer) => {
      const blob = `${customer.name} ${customer.code} ${customer.leadSource} ${customer.channel} ${customer.contacts.map((c) => `${c.name} ${c.mobile} ${c.email}`).join(" ")}`.toLowerCase();
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
        <PageHeader title="Lead list" lede="Search leads and open a customer record. A shared contact does not create a second company." />
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
        <DataTable>
          <thead>
            <tr>
              <th>Customer code</th>
              <th>Company name</th>
              <th>Primary contact</th>
              <th>Mobile / email</th>
              <th>Required service</th>
              <th>Lead source / channel</th>
              <th>Assigned sales executive</th>
              <th>Lead status</th>
              <th>Created / last modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => {
              const contact = primaryContact(customer);
              return (
                <tr key={customer.id}>
                  <td>{customer.code}</td>
                  <td>
                    <Link className="link" href={`/customers/${customer.code}`}>
                      {customer.name}
                    </Link>
                  </td>
                  <td>{contact?.name ?? "None"}</td>
                  <td>
                    {contact?.mobile ?? "None"}
                    <div className="hint">{contact?.email}</div>
                  </td>
                  <td>{customer.service}</td>
                  <td>
                    {customer.leadSource || "None"}
                    <div className="hint">{customer.channel || "No channel"}</div>
                  </td>
                  <td>{userName(state, customer.assignedTo)}</td>
                  <td>
                    <StatusText value={customer.leadStatus} />
                  </td>
                  <td>
                    {formatWhen(customer.createdAt)}
                    <div className="hint">{formatWhen(customer.updatedAt)}</div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <RowAction icon="view" label="View" href={`/customers/${customer.code}`} />
                      {can(state, "Leads", "edit") && <RowAction icon="edit" label="Edit" onClick={() => setEditing(customer)} />}
                      {can(state, "Applications", "create") && <RowAction icon="add" label="Create application" href={`/applications/new?customer=${customer.id}`} />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No leads match these filters.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <CreateLeadDialog
          open={adding || !!editing}
          customer={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={(code) => {
            setAdding(false);
            setEditing(null);
            router.push(`/customers/${code}`);
          }}
        />
      </div>
    </Gate>
  );
}
