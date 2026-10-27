"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateApplicationDialog } from "@/components/create-application-dialog";
import { Button, PageHeader, StatusText, DataTable } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { APP_STATUSES, BANKS, LOAN_TYPES } from "@/lib/constants";
import { aed, formatDate, formatWhen } from "@/lib/format";
import { deliveredTotal, latestDeliveryDate } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function ApplicationsPage() {
  const { state } = useDesk();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [loan, setLoan] = useState("All");
  const [sales, setSales] = useState("All");
  const [bank, setBank] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
      const contact = customer?.contacts.find((item) => item.id === app.ownerContactId);
      const submissions = state.submissions.filter((item) => item.applicationId === app.id);
      const blob = `${app.number} ${customer?.name ?? ""} ${customer?.code ?? ""} ${contact?.name ?? ""} ${app.preferredBanks.join(" ")} ${submissions.map((item) => item.bank).join(" ")}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All" && app.status !== status) return false;
      if (loan !== "All" && app.loanType !== loan) return false;
      if (sales !== "All" && app.assignedTo !== sales) return false;
      if (bank !== "All" && !submissions.some((item) => item.bank === bank) && !app.preferredBanks.includes(bank)) return false;
      if (from && app.date < from) return false;
      if (to && app.date > to) return false;
      return true;
    });
  }, [state, q, status, loan, sales, bank, from, to]);

  if (!state) return null;

  return (
    <div className="page">
        <PageHeader
          title="Application list"
          lede="Search applications and review current progress. Overall status follows every bank on the file."
        />
      <div className="filters">
        <input aria-label="Search applications" placeholder="Company, customer code, or application" value={q} onChange={(event) => setQ(event.target.value)} />
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
        <select aria-label="Bank" value={bank} onChange={(event) => setBank(event.target.value)}>
          <option>All</option>
          {BANKS.filter((item) => item !== "Other").map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
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
      <DataTable>
        <thead>
          <tr>
            <th>Application number</th>
            <th>Customer code / company</th>
            <th>Owner / signatory</th>
            <th>Assigned sales executive</th>
            <th>Loan type / requested amount</th>
            <th>Overall status</th>
            <th>Banks / submission status</th>
            <th>Delivered amount / date</th>
            <th>Created / last modified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((app) => {
            const customer = state.customers.find((item) => item.id === app.customerId);
            const banks = state.submissions.filter((item) => item.applicationId === app.id);
            const contact = customer?.contacts.find((item) => item.id === app.ownerContactId);
            const deliveredOn = latestDeliveryDate(state, app.id);
            return (
              <tr key={app.id}>
                <td>
                  <Link className="link" href={`/applications/${app.id}`}>
                    {app.number}
                  </Link>
                </td>
                <td>
                  {customer?.code}
                  <div className="hint">{customer?.name}</div>
                </td>
                <td>{contact?.name ?? "None"}</td>
                <td>{userName(state, app.assignedTo)}</td>
                <td>
                  {app.loanType}
                  <div className="hint num">{aed(app.amount)}</div>
                </td>
                <td>
                  <StatusText value={app.status} />
                </td>
                <td>
                  {banks.length === 0 && "None yet"}
                  {banks.map((item) => (
                    <div key={item.id}>
                      {item.bank}: {item.status}
                    </div>
                  ))}
                </td>
                <td>
                  {aed(deliveredTotal(state, app.id) || undefined)}
                  <div className="hint">{deliveredOn ? formatDate(deliveredOn) : "Not delivered"}</div>
                </td>
                <td>
                  {formatWhen(app.createdAt)}
                  <div className="hint">
                    {formatWhen(app.updatedAt)} · {userName(state, app.updatedBy)}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9}>No applications match these filters.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
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
