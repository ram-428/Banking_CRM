"use client";

import { useMemo, useState } from "react";
import { Button, DataTable, Field, Gate, PageHeader, Tabs } from "@/components/ui";
import { useDesk } from "@/lib/store";
import { SAMPLE_STATEMENT, SAMPLE_STATEMENT_MONTHS, type StatementMonthView } from "@/lib/sample-statement";

const money = (value?: number) => (value === undefined ? "" : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

const iso = (date: string) => date.split("/").reverse().join("-");
const WINDOWS = [3, 6, 12] as const;

function monthsFor(cutoff: string, window: number): StatementMonthView[] {
  const [year, month] = cutoff.split("-").map(Number);
  const startIndex = year * 12 + (month - 1) - (window - 1);
  return SAMPLE_STATEMENT_MONTHS.flatMap((item) => {
    const [y, m] = iso(item.lines[0].date).split("-").map(Number);
    const index = y * 12 + (m - 1);
    if (index < startIndex || index > year * 12 + (month - 1)) return [];
    const lines = item.lines.filter((line) => iso(line.date) <= cutoff);
    if (lines.length === 0) return [];
    if (lines.length === item.lines.length) return [item];
    const credits = lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
    const debits = lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
    const [cy, cm, cd] = cutoff.split("-");
    const monthName = item.to.split(" ")[1];
    return [{ ...item, to: `${cd} ${monthName} ${cy}`, credits, debits, closing: lines[lines.length - 1].balance, lines }];
  });
}

export default function StatementViewPage() {
  const { state } = useDesk();
  const options = useMemo(() => {
    if (!state) return [];
    const nameOf = (customerId: string) => state.customers.find((item) => item.id === customerId)?.name ?? "";
    return [
      ...state.applications.map((item) => ({ id: `app:${item.id}`, label: `${item.number} · ${nameOf(item.customerId)}`, date: item.date, customerId: item.customerId })),
      ...state.serviceRequests.map((item) => ({ id: `req:${item.id}`, label: `${item.number} · ${nameOf(item.customerId)}`, date: item.requestDate, customerId: item.customerId })),
    ];
  }, [state]);
  const [pick, setPick] = useState("");
  const [window, setWindow] = useState<number>(6);
  const [tab, setTab] = useState("");
  const chosen = options.find((item) => item.id === pick) ?? options[0];
  const months = useMemo(() => (chosen ? monthsFor(chosen.date, window) : []), [chosen, window]);
  if (!state) return null;
  const customer = state.customers.find((item) => item.id === chosen?.customerId);
  const ibanDigits = customer?.statement?.account.replace(/\s/g, "") ?? "";
  const d = {
    bank: customer?.statement?.bank ?? SAMPLE_STATEMENT.bank,
    holder: (customer?.name ?? SAMPLE_STATEMENT.holder).toUpperCase(),
    accountType: SAMPLE_STATEMENT.accountType,
    account: ibanDigits ? `XXXX XXXX ${ibanDigits.slice(-4)}` : SAMPLE_STATEMENT.account,
    iban: customer?.statement?.account ?? SAMPLE_STATEMENT.iban,
    branch: customer?.emirate ? `${customer.emirate}, UAE` : SAMPLE_STATEMENT.branch,
    currency: SAMPLE_STATEMENT.currency,
  };
  const month = months.find((item) => item.label === tab) ?? months[months.length - 1];
  const labels = months.map((item) => item.label);

  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader
          title="Bank statement"
          lede={month ? `${d.holder} · ${d.account} · ${months[0].from} to ${months[months.length - 1].to}` : "No statement months fall on or before the application date."}
          actions={<Button type="button" disabled={!month} onClick={() => globalThis.print()}>Export PDF</Button>}
        />
        <div className="fields" style={{ marginBottom: 12 }}>
          <Field label="Application or request">
            <select value={chosen?.id ?? ""} onChange={(event) => setPick(event.target.value)}>
              {options.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.date}</option>
              ))}
            </select>
          </Field>
          <Field label="Statement window before that date">
            <select value={window} onChange={(event) => setWindow(Number(event.target.value))}>
              {WINDOWS.map((item) => (
                <option key={item} value={item}>Last {item} months</option>
              ))}
            </select>
          </Field>
        </div>
        {chosen && <p className="hint" style={{ marginBottom: 12 }}>Showing transactions up to the application date, {chosen.date}.</p>}
        {month && (
        <div className="panel tab-card">
          <Tabs tabs={labels} value={month?.label ?? ""} onChange={setTab} />
          <div style={{ padding: 16, display: "grid", gap: 14 }}>
            <div className="fields">
              <div className="field"><span>Account holder</span><strong>{d.holder}</strong></div>
              <div className="field"><span>Account type</span><strong>{d.accountType}</strong></div>
              <div className="field"><span>Account no.</span><strong>{d.account}</strong></div>
              <div className="field"><span>IBAN</span><strong>{d.iban}</strong></div>
            </div>
            <p className="hint">
              {d.bank} · Branch: {d.branch} · Currency: {d.currency} · Statement period: {month.from} - {month.to}
            </p>
            <div className="fields" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <div className="field"><span>Opening balance</span><strong>{money(month.opening)}</strong></div>
              <div className="field"><span>Total credits</span><strong>{money(month.credits)}</strong></div>
              <div className="field"><span>Total debits</span><strong>{money(month.debits)}</strong></div>
              <div className="field"><span>Closing balance</span><strong>{money(month.closing)}</strong></div>
            </div>
            <DataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / reference</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {month.lines.map((line) => (
                  <tr key={line.reference}>
                    <td>{line.date}</td>
                    <td>
                      {line.description}
                      <div className="hint">{line.reference}</div>
                    </td>
                    <td className="num">{money(line.debit)}</td>
                    <td className="num">{money(line.credit)}</td>
                    <td className="num"><strong>{money(line.balance)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <p className="hint">All amounts in AED. Illustrative sample only: not issued by a financial institution and not proof of funds.</p>
          </div>
        </div>
        )}
      </div>
      <div className="stmt-print" aria-hidden="true">
        {months.map((m, index) => (
          <section key={m.label} className="stmt-sheet">
            <div className="stmt-band">
              <div>
                <div className="stmt-bank">{d.bank.toUpperCase()}</div>
                <div className="stmt-sub">Business Account Statement / United Arab Emirates</div>
              </div>
              <div className="stmt-tag">ILLUSTRATIVE SAMPLE</div>
            </div>
            <div className="stmt-body">
              <h2 className="stmt-month">{m.label.toUpperCase()}</h2>
              <p className="stmt-muted">Statement period: {m.from} - {m.to}</p>
              <div className="stmt-card">
                <div><small>ACCOUNT HOLDER</small><strong>{d.holder}</strong></div>
                <div><small>ACCOUNT TYPE</small><strong>{d.accountType}</strong></div>
                <div><small>ACCOUNT NO.</small><strong>{d.account}</strong></div>
                <div><small>IBAN</small><strong>{d.iban}</strong></div>
              </div>
              <p className="stmt-muted">Branch: {d.branch} &nbsp;|&nbsp; Account currency: {d.currency} &nbsp;|&nbsp; Statement frequency: Monthly</p>
              <div className="stmt-tiles">
                <div><small>OPENING BALANCE</small><strong>{money(m.opening)}</strong></div>
                <div><small>TOTAL CREDITS</small><strong>{money(m.credits)}</strong></div>
                <div><small>TOTAL DEBITS</small><strong>{money(m.debits)}</strong></div>
                <div><small>CLOSING BALANCE</small><strong className="stmt-teal">{money(m.closing)}</strong></div>
              </div>
              <h3 className="stmt-h3">ACCOUNT TRANSACTIONS</h3>
              <table className="stmt-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>DESCRIPTION / REFERENCE</th>
                    <th className="r">DEBIT</th>
                    <th className="r">CREDIT</th>
                    <th className="r">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {m.lines.map((line) => (
                    <tr key={line.reference}>
                      <td>{line.date}</td>
                      <td><b>{line.description}</b><span>{line.reference}</span></td>
                      <td className="r">{money(line.debit)}</td>
                      <td className="r">{money(line.credit)}</td>
                      <td className="r"><b>{money(line.balance)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="stmt-foot">
                <p>All amounts in AED. Transaction descriptions and references are fictional.</p>
                <p>This document is an illustrative template and is not issued by a financial institution.</p>
                <div><b className="stmt-red">DEMONSTRATION ONLY - NOT PROOF OF FUNDS</b><span>Page {index + 1} of {months.length}</span></div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </Gate>
  );
}
