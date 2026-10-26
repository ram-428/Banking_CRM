"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink, Field, PageHeader, StatusText, Tabs } from "@/components/ui";
import { userName } from "@/lib/access";
import { updateCustomer } from "@/lib/actions";
import { BANKS, EMIRATES, LEAD_STATUSES, LEGAL_TYPES, LOBS } from "@/lib/constants";
import { aed, formatWhen, uid } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Customer } from "@/lib/types";

const TABS = ["Company", "Contacts", "Shareholders", "Compliance", "Banking", "Financials", "Exposure"];

export default function CustomerPage() {
  const params = useParams<{ code: string }>();
  const { state, replace, user } = useDesk();
  const customer = state?.customers.find((item) => item.code === params.code);
  const [tab, setTab] = useState("Company");
  const [draft, setDraft] = useState<Customer | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (customer) setDraft(structuredClone(customer));
  }, [customer]);

  if (!state || !user || !customer || !draft) return null;
  const apps = state.applications.filter((item) => item.customerId === customer.id);
  const parent = state.customers.find((item) => item.id === draft.parentId);

  function patch(partial: Partial<Customer>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
    setSaved(false);
  }

  function save(detail: string) {
    if (!draft) return;
    replace(updateCustomer(state!, draft.id, draft, user!, detail));
    setSaved(true);
  }

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/leads", label: "Leads" }, { label: customer.code }]}
        title={draft.name}
        lede={`${customer.code} · ${draft.folderRef} · last change ${formatWhen(customer.updatedAt)} by ${userName(state, customer.updatedBy)}`}
        actions={<ButtonLink href={`/applications/new?customer=${customer.id}`}>Create application</ButtonLink>}
      />
      <div className="fields" style={{ marginBottom: 18, alignItems: "end" }}>
        <Field label="Lead status">
          <select value={draft.leadStatus} onChange={(event) => patch({ leadStatus: event.target.value as Customer["leadStatus"] })}>
            {LEAD_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Profile">
          <div style={{ height: 36, display: "flex", alignItems: "center" }}>
            <StatusText value={draft.profileStatus} />
          </div>
        </Field>
        <div>
          <Button onClick={() => save("Company profile saved.")}>Save profile</Button>
          {saved && <span className="hint"> Saved.</span>}
        </div>
      </div>
      {apps.length > 0 && (
        <p className="hint" style={{ marginBottom: 12 }}>
          Applications:{" "}
          {apps.map((app) => (
            <Link key={app.id} href={`/applications/${app.id}`} style={{ marginRight: 10 }}>
              {app.number}
            </Link>
          ))}
        </p>
      )}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Company" && (
        <div className="fields">
          <Field label="Company name" required>
            <input value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
          </Field>
          <Field label="Legal type" required>
            <select value={draft.legalType} onChange={(event) => patch({ legalType: event.target.value })}>
              {LEGAL_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Trade licence">
            <input value={draft.tradeLicense} onChange={(event) => patch({ tradeLicense: event.target.value })} />
          </Field>
          <Field label="Start date">
            <input type="date" value={draft.startDate ?? ""} onChange={(event) => patch({ startDate: event.target.value })} />
          </Field>
          <Field label="Line of business" required>
            <select value={draft.lob} onChange={(event) => patch({ lob: event.target.value })}>
              {LOBS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Employees" required>
            <input value={draft.employees ?? ""} onChange={(event) => patch({ employees: Number(event.target.value) })} />
          </Field>
          <Field label="Relationship">
            <select value={draft.relationship} onChange={(event) => patch({ relationship: event.target.value as Customer["relationship"] })}>
              <option>Main</option>
              <option>Subsidiary</option>
            </select>
          </Field>
          {draft.relationship === "Subsidiary" && (
            <Field label="Parent company" required>
              <select value={draft.parentId ?? ""} onChange={(event) => patch({ parentId: event.target.value })}>
                <option value="">Select</option>
                {state.customers
                  .filter((item) => item.id !== draft.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {parent && <p className="hint">Parent: {parent.name}</p>}
          <Field label="Country">
            <input value={draft.country} onChange={(event) => patch({ country: event.target.value })} />
          </Field>
          <Field label="Emirate">
            <select value={draft.emirate} onChange={(event) => patch({ emirate: event.target.value })}>
              {EMIRATES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Office address" className="span-2">
            <textarea value={draft.address} onChange={(event) => patch({ address: event.target.value })} />
          </Field>
          <Field label="Tenancy contract available">
            <select value={draft.tenancy} onChange={(event) => patch({ tenancy: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Website">
            <input value={draft.website ?? ""} onChange={(event) => patch({ website: event.target.value })} />
          </Field>
          <Field label="Company activity" className="span-2">
            <textarea value={draft.activity ?? ""} onChange={(event) => patch({ activity: event.target.value })} />
          </Field>
        </div>
      )}
      {tab === "Contacts" && (
        <div>
          {draft.contacts.map((contact, index) => (
            <div key={contact.id} className="fields" style={{ marginBottom: 16 }}>
              <Field label="Name" required>
                <input
                  value={contact.name}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, name: event.target.value };
                    patch({ contacts });
                  }}
                />
              </Field>
              <Field label="Type" required>
                <select
                  value={contact.type}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, type: event.target.value as typeof contact.type };
                    patch({ contacts });
                  }}
                >
                  <option>Owner</option>
                  <option>Signatory</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Mobile" required>
                <input
                  value={contact.mobile}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, mobile: event.target.value };
                    patch({ contacts });
                  }}
                />
              </Field>
              <Field label="Email" required>
                <input
                  value={contact.email}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, email: event.target.value };
                    patch({ contacts });
                  }}
                />
              </Field>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              patch({
                contacts: [...draft.contacts, { id: uid("ct"), name: "", type: "Other", mobile: "", email: "" }],
              })
            }
          >
            Add contact
          </Button>
        </div>
      )}
      {tab === "Shareholders" && (
        <div>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Share %</th>
                <th>Country of birth</th>
                <th>Residency</th>
              </tr>
            </thead>
            <tbody>
              {draft.shareholders.map((holder, index) => (
                <tr key={holder.id}>
                  {(["name", "share", "countryOfBirth", "residency"] as const).map((key) => (
                    <td key={key}>
                      <input
                        value={holder[key]}
                        onChange={(event) => {
                          const shareholders = [...draft.shareholders];
                          const value = key === "share" ? Number(event.target.value) : event.target.value;
                          shareholders[index] = { ...holder, [key]: value };
                          patch({ shareholders });
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            variant="secondary"
            onClick={() =>
              patch({
                shareholders: [...draft.shareholders, { id: uid("sh"), name: "", share: 0, countryOfBirth: "", residency: "UAE resident" }],
              })
            }
          >
            Add shareholder
          </Button>
        </div>
      )}
      {tab === "Compliance" && (
        <div className="fields">
          <Field label="MOA available" required>
            <select value={draft.moa} onChange={(event) => patch({ moa: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="MOA amendment count">
            <input value={draft.moaAmendments} onChange={(event) => patch({ moaAmendments: Number(event.target.value) })} />
          </Field>
          <Field label="Amendment dates" hint="Comma-separated dates" className="span-2">
            <input value={draft.amendmentDates.join(", ")} onChange={(event) => patch({ amendmentDates: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          </Field>
          <Field label="POA details" className="span-2">
            <textarea value={draft.poa ?? ""} onChange={(event) => patch({ poa: event.target.value })} />
          </Field>
          <Field label="VAT certificate available">
            <select value={draft.vatCertificate} onChange={(event) => patch({ vatCertificate: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Corporate certificate available">
            <select value={draft.corporateCertificate} onChange={(event) => patch({ corporateCertificate: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
        </div>
      )}
      {tab === "Banking" && (
        <div>
          <ul>
            {draft.banks.map((bank) => (
              <li key={bank.id}>{bank.bank}</li>
            ))}
          </ul>
          <Field label="Add bank relationship">
            <select
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                patch({ banks: [...draft.banks, { id: uid("br"), bank: event.target.value }] });
              }}
            >
              <option value="">Select a UAE bank</option>
              {BANKS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {tab === "Financials" && (
        <div className="fields">
          <Field label="Sales turnover, last 12 months (AED)" required>
            <input value={draft.salesTurnover ?? ""} onChange={(event) => patch({ salesTurnover: Number(event.target.value), salesPeriod: draft.salesPeriod || "Last 12 months" })} />
          </Field>
          <Field label="POS turnover (AED)">
            <input value={draft.posTurnover ?? ""} onChange={(event) => patch({ posTurnover: Number(event.target.value), posPeriod: "Last 12 months" })} />
          </Field>
          <Field label="Bank turnover (AED)" required>
            <input value={draft.bankTurnover ?? ""} onChange={(event) => patch({ bankTurnover: Number(event.target.value), bankPeriod: "Last 12 months" })} />
          </Field>
          <Field label="Average balance, 6 months">
            <input value={draft.avgBalance6 ?? ""} onChange={(event) => patch({ avgBalance6: Number(event.target.value) })} />
          </Field>
          <Field label="Average balance, 12 months">
            <input value={draft.avgBalance12 ?? ""} onChange={(event) => patch({ avgBalance12: Number(event.target.value) })} />
          </Field>
          <Field label="Audit report available">
            <select value={draft.auditAvailable} onChange={(event) => patch({ auditAvailable: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <div className="span-2">
            <h2 className="block-title">VAT returns</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {draft.vatReturns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.from}</td>
                    <td>{row.to}</td>
                    <td className="num">{aed(row.amount)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="secondary"
              onClick={() => patch({ vatReturns: [...draft.vatReturns, { id: uid("vat"), from: "2026-01", to: "2026-03", amount: 0, status: "Draft" }] })}
            >
              Add VAT period
            </Button>
          </div>
        </div>
      )}
      {tab === "Exposure" && (
        <div>
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
              {draft.exposures.map((row) => (
                <tr key={row.id}>
                  <td>{row.bank}</td>
                  <td>{row.facility}</td>
                  <td className="num">{aed(row.value)}</td>
                  <td className="num">{aed(row.emi)}</td>
                </tr>
              ))}
              {draft.exposures.length === 0 && (
                <tr>
                  <td colSpan={4}>No facilities recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="fields" style={{ marginTop: 16 }}>
            <Field label="Cheque bounce">
              <select value={draft.chequeBounce} onChange={(event) => patch({ chequeBounce: event.target.value as "Yes" | "No" })}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </Field>
          </div>
          {draft.chequeBounce === "Yes" && (
            <ul>
              {draft.bounces.map((bounce) => (
                <li key={bounce.id}>
                  {bounce.date} · {aed(bounce.amount)} · {bounce.status}. {bounce.remarks}
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            onClick={() =>
              patch({
                exposures: [...draft.exposures, { id: uid("ex"), bank: "Emirates NBD", facility: "Working capital", value: 0, emi: 0 }],
              })
            }
          >
            Add facility
          </Button>
        </div>
      )}
    </div>
  );
}
