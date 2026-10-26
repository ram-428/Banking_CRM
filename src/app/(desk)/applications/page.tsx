"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateApplicationDialog } from "@/components/create-application-dialog";
import { Button, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { APP_STATUSES, LOAN_TYPES } from "@/lib/constants";
import { aed, formatDate } from "@/lib/format";
import { deliveredTotal } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function ApplicationsPage() {
  const { state } = useDesk();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [loan, setLoan] = useState("All");
  const [sales, setSales] = useState("All");
  const [adding, setAdding] = useState(false);
  const [preset, setPreset] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("vrw-open-create") !== "application") return;
    sessionStorage.removeItem("vrw-open-create");
    setPreset(sessionStorage.getItem("vrw-open-customer") ?? "");
    sessionStorage.removeItem("vrw-open-customer");
    setAdding(true);
  }, []);
  const rows = useMemo(() => {
    if (!state) return [];
    return state.applications.filter((app) => {
      const customer = state.customers.find((item) => item.id === app.customerId);
      const blob = `${app.number} ${customer?.name ?? ""} ${customer?.code ?? ""} ${app.preferredBanks.join(" ")}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All" && app.status !== status) return false;
      if (loan !== "All" && app.loanType !== loan) return false;
      if (sales !== "All" && app.assignedTo !== sales) return false;
      return true;
    });
  }, [state, q, status, loan, sales]);

  if (!state) return null;

  return (
    <div className="page">
      <PageHeader
        title="Applications"
        lede="One company can hold several applications. Each bank submission keeps its own status."
      />
      <div className="filters">
        <input aria-label="Search applications" placeholder="Search company, code, or application" value={q} onChange={(event) => setQ(event.target.value)} />
        <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>All</option>
          {APP_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select aria-label="Loan type" value={loan} onChange={(event) => setLoan(event.target.value)}>
          <option>All</option>
          {LOAN_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select aria-label="Sales executive" value={sales} onChange={(event) => setSales(event.target.value)}>
          <option value="All">All sales</option>
          {state.users
            .filter((user) => user.role === "Sales")
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
        </select>
        {can(state, "Applications", "create") && (
          <Button
            type="button"
            className="push"
            onClick={() => {
              setPreset("");
              setAdding(true);
            }}
          >
            + Create application
          </Button>
        )}
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Application</th>
            <th>Company</th>
            <th>Loan</th>
            <th>Status</th>
            <th>Banks</th>
            <th>Delivered</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((app) => {
            const customer = state.customers.find((item) => item.id === app.customerId);
            const banks = state.submissions.filter((item) => item.applicationId === app.id);
            const contact = customer?.contacts.find((item) => item.id === app.ownerContactId);
            return (
              <tr key={app.id}>
                <td>
                  <Link className="link" href={`/applications/${app.id}`}>
                    {app.number}
                  </Link>
                  <div className="hint">{userName(state, app.assignedTo)}</div>
                </td>
                <td>
                  {customer?.name}
                  <div className="hint">
                    {customer?.code} · {contact?.name}
                  </div>
                </td>
                <td>
                  {app.loanType}
                  <div className="hint num">{aed(app.amount)}</div>
                </td>
                <td>
                  <StatusText value={app.status} />
                </td>
                <td>
                  {banks.length === 0 && "None yet"}
                  {banks.map((bank) => (
                    <div key={bank.id}>
                      {bank.bank}: {bank.status}
                    </div>
                  ))}
                </td>
                <td className="num">{aed(deliveredTotal(state, app.id) || undefined)}</td>
                <td>{formatDate(app.updatedAt)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7}>No applications match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
        <CreateApplicationDialog
          open={adding}
          presetCustomerId={preset}
          onClose={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            router.push(`/applications/${id}`);
          }}
        />
    </div>
  );
}
