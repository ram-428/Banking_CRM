"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText, Tabs } from "@/components/ui";
import { userName } from "@/lib/access";
import { finalizeStatements, updateCustomer } from "@/lib/actions";
import { BANKS } from "@/lib/constants";
import { aed, formatWhen, uid } from "@/lib/format";
import { profileSections } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function FinancialProfilePage() {
  const { code } = useParams<{ code: string }>();
  const { state, replace, user } = useDesk();
  const customer = state?.customers.find((item) => item.code === code);
  const [tab, setTab] = useState("Overview");
  const [bank, setBank] = useState("Emirates NBD");
  const [facility, setFacility] = useState("Working capital");
  const [value, setValue] = useState("");
  const [emi, setEmi] = useState("");
  if (!state || !user || !customer) {
    return (
      <Gate module="Financials">
        <div className="page">
          <PageHeader title="Profile not found" />
        </div>
      </Gate>
    );
  }
  const sections = profileSections(customer);
  const apps = state.applications.filter((item) => item.customerId === customer.id);

  return (
    <Gate module="Financials">
      <div className="page">
        <PageHeader
          crumbs={[{ href: "/financials", label: "Financial profiles" }, { label: customer.code }]}
          title={customer.name}
          lede={`${sections.ready} of ${sections.total} sections are ready. Last change ${formatWhen(customer.updatedAt)} by ${userName(state, customer.updatedBy)}.`}
        />
        <div style={{ marginBottom: 8 }}>
          <StatusText value={customer.profileStatus} />
        </div>
        <Tabs tabs={["Overview", "Banking", "VAT", "Statements", "Audit"]} value={tab} onChange={setTab} />
        {tab === "Overview" && (
          <dl className="facts">
            <div>
              <dt>Sales turnover</dt>
              <dd>{aed(customer.salesTurnover)}</dd>
            </div>
            <div>
              <dt>POS turnover</dt>
              <dd>{aed(customer.posTurnover)}</dd>
            </div>
            <div>
              <dt>Bank turnover</dt>
              <dd>{aed(customer.bankTurnover)}</dd>
            </div>
            <div>
              <dt>Average balance, 6 months</dt>
              <dd>{aed(customer.avgBalance6)}</dd>
            </div>
            <div>
              <dt>Average balance, 12 months</dt>
              <dd>{aed(customer.avgBalance12)}</dd>
            </div>
            <div>
              <dt>Employees</dt>
              <dd>{customer.employees ?? "Not set"}</dd>
            </div>
          </dl>
        )}
        {tab === "Banking" && (
          <div>
            <h2 className="block-title">Relationships</h2>
            <ul>
              {customer.banks.map((item) => (
                <li key={item.id}>{item.bank}</li>
              ))}
            </ul>
            <h2 className="block-title">Existing exposure</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Facility</th>
                  <th>Value</th>
                  <th>EMI</th>
                </tr>
              </thead>
              <tbody>
                {customer.exposures.map((row) => (
                  <tr key={row.id}>
                    <td>{row.bank}</td>
                    <td>{row.facility}</td>
                    <td className="num">{aed(row.value)}</td>
                    <td className="num">{aed(row.emi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="fields" style={{ marginTop: 12 }}>
              <Field label="Bank">
                <select value={bank} onChange={(event) => setBank(event.target.value)}>
                  {BANKS.filter((item) => item !== "Other").map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Facility">
                <input value={facility} onChange={(event) => setFacility(event.target.value)} />
              </Field>
              <Field label="Value">
                <input value={value} onChange={(event) => setValue(event.target.value)} />
              </Field>
              <Field label="EMI">
                <input value={emi} onChange={(event) => setEmi(event.target.value)} />
              </Field>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                replace(
                  updateCustomer(
                    state,
                    customer.id,
                    { exposures: [...customer.exposures, { id: uid("ex"), bank, facility, value: Number(value) || 0, emi: Number(emi) || 0 }] },
                    user,
                    "Exposure record added.",
                  ),
                )
              }
            >
              Add exposure
            </Button>
          </div>
        )}
        {tab === "VAT" && (
          <div>
            <p>VAT certificate: {customer.vatCertificate}</p>
            <table className="data">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.vatReturns.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.from} to {row.to}
                    </td>
                    <td className="num">{aed(row.amount)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {customer.vatReturns.length === 0 && (
                  <tr>
                    <td colSpan={3}>No VAT periods yet. Add them on the company profile.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === "Statements" && (
          <div>
            {!customer.statement && <p>No statement analysis has been prepared.</p>}
            {customer.statement && (
              <>
                <p>
                  {customer.statement.bank} · {customer.statement.account} · {customer.statement.window}
                </p>
                <p className="hint" style={{ margin: "8px 0" }}>
                  Review status: {customer.statement.status}
                </p>
                <div className="months" aria-label="Statement coverage">
                  {customer.statement.months.map((month) => (
                    <span key={month.label} className={month.covered ? "" : "gap"}>
                      {month.label}
                      <br />
                      {month.covered ? "In file" : "Gap"}
                    </span>
                  ))}
                </div>
                <dl className="facts" style={{ marginTop: 18 }}>
                  <div>
                    <dt>Credits</dt>
                    <dd>{aed(customer.statement.credits)}</dd>
                  </div>
                  <div>
                    <dt>Debits</dt>
                    <dd>{aed(customer.statement.debits)}</dd>
                  </div>
                  <div>
                    <dt>Average balance</dt>
                    <dd>{aed(customer.statement.averageBalance)}</dd>
                  </div>
                  <div>
                    <dt>Bank turnover in window</dt>
                    <dd>{aed(customer.statement.turnover)}</dd>
                  </div>
                </dl>
                {customer.statement.flags.map((flag) => (
                  <p key={flag}>{flag}</p>
                ))}
                {customer.statement.status !== "Finalized" && (
                  <Button onClick={() => replace(finalizeStatements(state, customer.id, user))}>Mark statement review complete</Button>
                )}
              </>
            )}
          </div>
        )}
        {tab === "Audit" && (
          <div>
            <p>Audit report available: {customer.auditAvailable}</p>
            {customer.audits.map((row) => (
              <dl key={row.id} className="facts" style={{ marginTop: 12 }}>
                <div>
                  <dt>Year</dt>
                  <dd>{row.year}</dd>
                </div>
                <div>
                  <dt>Firm</dt>
                  <dd>{row.firm || "Not named"}</dd>
                </div>
                <div>
                  <dt>Revenue</dt>
                  <dd>{aed(row.revenue)}</dd>
                </div>
                <div>
                  <dt>Net profit</dt>
                  <dd>{aed(row.profit)}</dd>
                </div>
                <div>
                  <dt>Assets</dt>
                  <dd>{aed(row.assets)}</dd>
                </div>
                <div>
                  <dt>Liabilities</dt>
                  <dd>{aed(row.liabilities)}</dd>
                </div>
              </dl>
            ))}
          </div>
        )}
        <p className="hint" style={{ marginTop: 22 }}>
          Used by {apps.map((app) => app.number).join(", ") || "no application yet"}.
        </p>
      </div>
    </Gate>
  );
}
