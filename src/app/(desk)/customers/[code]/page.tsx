"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PortalInvitationPanel } from "@/components/portal-invitation-panel";
import { Button, ButtonLink, Field, PageHeader, StatusText, Tabs, DataTable } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { updateCustomer, validateCustomerRecords } from "@/lib/actions";
import { BANKS, EMIRATES, LEAD_STATUSES, LEGAL_TYPES, LOBS } from "@/lib/constants";
import { aed, formatWhen, uid } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Customer } from "@/lib/types";

const TABS = ["Company Details", "Contacts", "Shareholders", "Compliance", "Banking Relationships", "Financial Information", "Existing Loans / Exposure", "Cheque Bounce Details", "Portal Invitation", "Activity History"];

export default function CustomerPage() {
  const params = useParams<{ code: string }>();
  const { state, replace, user } = useDesk();
  const customer = state?.customers.find((item) => item.code === params.code);
  const [tab, setTab] = useState("Company Details");
  const [draft, setDraft] = useState<Customer | null>(null);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (customer) setDraft(structuredClone(customer));
  }, [customer]);

  if (!state || !user || !customer || !draft) return null;
  const apps = state.applications.filter((item) => item.customerId === customer.id);
  const canEdit = can(state, "Leads", "edit");
  const parent = state.customers.find((item) => item.id === draft.parentId);

  function patch(partial: Partial<Customer>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
    setSaved(false);
  }

  function save(detail: string) {
    if (!draft) return;
    const problem = validateCustomerRecords(draft);
    if (problem) {
      setFormError(problem);
      setSaved(false);
      return;
    }
    setFormError("");
    replace(updateCustomer(state!, draft.id, draft, user!, detail));
    setSaved(true);
  }

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/customers", label: "Customer profiles" }, { label: customer.code }]}
        title={draft.name}
        lede={`${customer.code} · ${draft.folderRef} · last change ${formatWhen(customer.updatedAt)} by ${userName(state, customer.updatedBy)}`}
        actions={
          <>
            <ButtonLink href={`/service-requests?customer=${customer.id}`}>Create service request</ButtonLink>
          </>
        }
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
          <Button onClick={() => save("Company profile saved.")} disabled={!canEdit}>
            Save profile
          </Button>
          {formError && <p className="err">{formError}</p>}
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
      <fieldset disabled={!canEdit} style={{ border: 0, margin: 0, padding: 0 }}>
      {tab === "Company Details" && (
        <div className="fields">
          <Field label="Company code" hint="Generated with the private folder. Read-only.">
            <input value={customer.code} readOnly />
          </Field>
          <Field label="Folder reference" hint="Created when the lead is saved.">
            <input value={draft.folderRef} readOnly />
          </Field>
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
          <Field label="Number of employees" required hint="Required once the company profile is completed.">
            <input value={draft.employees ?? ""} onChange={(event) => patch({ employees: event.target.value ? Number(event.target.value) : undefined })} />
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
          <Field label="Last modified" hint="System timestamp. Read-only.">
            <input value={formatWhen(customer.updatedAt)} readOnly />
          </Field>
          <Field label="Modified by" hint="Employee who last saved the profile.">
            <input value={userName(state, customer.updatedBy)} readOnly />
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
              <Field label="Designation">
                <input
                  value={contact.designation ?? ""}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, designation: event.target.value };
                    patch({ contacts });
                  }}
                />
              </Field>
              <Field label="Alternate contact number">
                <input
                  value={contact.alternate ?? ""}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, alternate: event.target.value };
                    patch({ contacts });
                  }}
                />
              </Field>
              <Field label="Nationality">
                <input
                  value={contact.nationality ?? ""}
                  onChange={(event) => {
                    const contacts = [...draft.contacts];
                    contacts[index] = { ...contact, nationality: event.target.value };
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
          <DataTable>
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
          </DataTable>
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
          <Field label="POA details and document reference" className="span-2">
            <textarea value={draft.poa ?? ""} onChange={(event) => patch({ poa: event.target.value })} />
          </Field>
          <Field label="VAT certificate available">
            <select value={draft.vatCertificate} onChange={(event) => patch({ vatCertificate: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="VAT document reference">
            <input value={draft.vatDocument ?? ""} onChange={(event) => patch({ vatDocument: event.target.value })} />
          </Field>
          <Field label="Corporate certificate available">
            <select value={draft.corporateCertificate} onChange={(event) => patch({ corporateCertificate: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Corporate certificate reference">
            <input value={draft.corporateDocument ?? ""} onChange={(event) => patch({ corporateDocument: event.target.value })} />
          </Field>
        </div>
      )}
      {tab === "Banking Relationships" && (
        <div>
          <DataTable>
            <thead>
              <tr>
                <th>Bank name</th>
                <th>Relationship type</th>
                <th>Account reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {draft.banks.map((bank, index) => (
                <tr key={bank.id}>
                  <td>{bank.bank}</td>
                  <td>
                    <input
                      value={bank.relationshipType ?? ""}
                      placeholder="Operating account"
                      onChange={(event) => {
                        const banks = [...draft.banks];
                        banks[index] = { ...bank, relationshipType: event.target.value };
                        patch({ banks });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={bank.account ?? ""}
                      onChange={(event) => {
                        const banks = [...draft.banks];
                        banks[index] = { ...bank, account: event.target.value };
                        patch({ banks });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={bank.status ?? ""}
                      placeholder="Active"
                      onChange={(event) => {
                        const banks = [...draft.banks];
                        banks[index] = { ...bank, status: event.target.value };
                        patch({ banks });
                      }}
                    />
                  </td>
                </tr>
              ))}
              {draft.banks.length === 0 && (
                <tr>
                  <td colSpan={4}>No bank relationships yet.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
          <Field label="Add bank relationship">
            <select
              value=""
              onChange={(event) => {
                if (!event.target.value || event.target.value === "Other") return;
                patch({ banks: [...draft.banks, { id: uid("br"), bank: event.target.value, relationshipType: "Operating account", status: "Active" }] });
              }}
            >
              <option value="">Select a UAE bank</option>
              {BANKS.filter((item) => item !== "Other").map((item) => (
                <option key={item}>{item}</option>
              ))}
              <option>Other</option>
            </select>
          </Field>
          <Field label="Other bank name">
            <input
              placeholder="Type a bank, then leave the field to add it"
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (!name) return;
                patch({ banks: [...draft.banks, { id: uid("br"), bank: name, relationshipType: "Operating account", status: "Active" }] });
                event.target.value = "";
              }}
            />
          </Field>
        </div>
      )}
      {tab === "Financial Information" && (
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
          <div className="span-2">
            <h2 className="block-title">Turnover periods</h2>
            <DataTable>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Sales</th>
                  <th>POS</th>
                  <th>Bank</th>
                  <th>Source</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(draft.turnovers ?? []).map((row, index) => (
                  <tr key={row.id}>
                    {(["from", "to"] as const).map((key) => (
                      <td key={key}>
                        <input type="date" value={row[key]} onChange={(event) => {
                          const turnovers = [...(draft.turnovers ?? [])];
                          turnovers[index] = { ...row, [key]: event.target.value };
                          patch({ turnovers });
                        }} />
                      </td>
                    ))}
                    {(["sales", "pos", "bank"] as const).map((key) => (
                      <td key={key}>
                        <input value={row[key]} onChange={(event) => {
                          const turnovers = [...(draft.turnovers ?? [])];
                          turnovers[index] = { ...row, [key]: Number(event.target.value) };
                          patch({ turnovers });
                        }} />
                      </td>
                    ))}
                    <td>
                      <select value={row.source} onChange={(event) => {
                        const turnovers = [...(draft.turnovers ?? [])];
                        turnovers[index] = { ...row, source: event.target.value as NonNullable<Customer["turnovers"]>[number]["source"] };
                        patch({ turnovers });
                      }}>
                        <option>Manual</option>
                        <option>AI Extracted</option>
                        <option>Reviewed Document</option>
                      </select>
                    </td>
                    <td>
                      <input value={row.remarks ?? ""} onChange={(event) => {
                        const turnovers = [...(draft.turnovers ?? [])];
                        turnovers[index] = { ...row, remarks: event.target.value };
                        patch({ turnovers });
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Button type="button" variant="secondary" onClick={() => patch({ turnovers: [...(draft.turnovers ?? []), { id: uid("trn"), from: "", to: "", sales: 0, pos: 0, bank: 0, source: "Manual" }] })}>
              Add turnover period
            </Button>
            <h2 className="block-title">Average bank balances</h2>
            <DataTable>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Other bank name</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Average balance</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {(draft.averageBalances ?? []).map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <select value={row.bank} onChange={(event) => {
                        const averageBalances = [...(draft.averageBalances ?? [])];
                        averageBalances[index] = { ...row, bank: event.target.value };
                        patch({ averageBalances });
                      }}>
                        {BANKS.map((bank) => <option key={bank}>{bank}</option>)}
                      </select>
                    </td>
                    <td>
                      <input value={row.otherBank ?? ""} disabled={row.bank !== "Other"} onChange={(event) => {
                        const averageBalances = [...(draft.averageBalances ?? [])];
                        averageBalances[index] = { ...row, otherBank: event.target.value };
                        patch({ averageBalances });
                      }} />
                    </td>
                    <td><input type="date" value={row.from} onChange={(event) => {
                      const averageBalances = [...(draft.averageBalances ?? [])];
                      averageBalances[index] = { ...row, from: event.target.value };
                      patch({ averageBalances });
                    }} /></td>
                    <td><input type="date" value={row.to} onChange={(event) => {
                      const averageBalances = [...(draft.averageBalances ?? [])];
                      averageBalances[index] = { ...row, to: event.target.value };
                      patch({ averageBalances });
                    }} /></td>
                    <td><input value={row.average} onChange={(event) => {
                      const averageBalances = [...(draft.averageBalances ?? [])];
                      averageBalances[index] = { ...row, average: Number(event.target.value) };
                      patch({ averageBalances });
                    }} /></td>
                    <td>
                      <select value={row.source} onChange={(event) => {
                        const averageBalances = [...(draft.averageBalances ?? [])];
                        averageBalances[index] = { ...row, source: event.target.value as NonNullable<Customer["averageBalances"]>[number]["source"] };
                        patch({ averageBalances });
                      }}>
                        <option>Manual</option>
                        <option>AI Extracted</option>
                        <option>Reviewed Document</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Button type="button" variant="secondary" onClick={() => patch({ averageBalances: [...(draft.averageBalances ?? []), { id: uid("bal"), bank: "Emirates NBD", from: "", to: "", average: 0, source: "Manual" }] })}>
              Add average balance
            </Button>
          </div>
          <Field label="Audit report available">
            <select value={draft.auditAvailable} onChange={(event) => patch({ auditAvailable: event.target.value as "Yes" | "No" })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          {draft.auditAvailable === "Yes" && (
            <div className="span-2">
              <h2 className="block-title">Audit years</h2>
              <p className="hint">{draft.audits.length} financial year{draft.audits.length === 1 ? "" : "s"} on file.</p>
              {draft.audits.map((row, index) => (
                <div key={row.id} className="fields" style={{ marginBottom: 10 }}>
                  {(
                    [
                      ["year", "Financial year"],
                      ["firm", "Audit firm"],
                      ["revenue", "Total revenue"],
                      ["profit", "Net profit / loss"],
                      ["assets", "Total assets"],
                      ["liabilities", "Total liabilities"],
                      ["attachment", "Audit report document"],
                      ["remarks", "Remarks"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        value={row[key] ?? ""}
                        onChange={(event) => {
                          const audits = [...draft.audits];
                          const numeric = key === "revenue" || key === "profit" || key === "assets" || key === "liabilities";
                          audits[index] = { ...row, [key]: numeric ? Number(event.target.value) : event.target.value };
                          patch({ audits });
                        }}
                      />
                    </Field>
                  ))}
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => patch({ audits: [...draft.audits, { id: uid("aud"), year: "", attachment: "" }] })}>
                Add audit year
              </Button>
            </div>
          )}
          <div className="span-2">
            <h2 className="block-title">VAT returns</h2>
            <p className="hint">{`VAT registered: ${draft.vatCertificate}. Certificate: ${draft.vatDocument || "None"}. Total of recorded returns: ${aed(draft.vatReturns.reduce((sum, row) => sum + (Number(row.amount) || 0), 0))}.`}</p>
            <DataTable>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Attachment</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {draft.vatReturns.map((row, index) => (
                  <tr key={row.id}>
                    {(["from", "to", "amount", "status", "attachment", "remarks"] as const).map((key) => (
                      <td key={key}>
                        <input
                          value={row[key] ?? ""}
                          onChange={(event) => {
                            const vatReturns = [...draft.vatReturns];
                            const value = key === "amount" ? Number(event.target.value) : event.target.value;
                            vatReturns[index] = { ...row, [key]: value };
                            patch({ vatReturns });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Button
              variant="secondary"
              onClick={() => patch({ vatReturns: [...draft.vatReturns, { id: uid("vat"), from: "", to: "", amount: 0, status: "Draft", attachment: "" }] })}
            >
              Add VAT period
            </Button>
          </div>
        </div>
      )}
      {tab === "Existing Loans / Exposure" && (
        <div>
          <DataTable>
            <thead>
              <tr>
                <th>Bank</th>
                <th>Facility</th>
                <th>Value</th>
                <th>EMI</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Statement</th>
              </tr>
            </thead>
            <tbody>
              {draft.exposures.map((row, index) => (
                <tr key={row.id}>
                  {(
                    [
                      ["bank", "text"],
                      ["facility", "text"],
                      ["value", "number"],
                      ["emi", "number"],
                      ["startDate", "date"],
                      ["endDate", "date"],
                      ["status", "text"],
                      ["document", "text"],
                    ] as const
                  ).map(([key, kind]) => (
                    <td key={key}>
                      <input
                        type={kind === "date" ? "date" : "text"}
                        value={row[key] ?? ""}
                        onChange={(event) => {
                          const exposures = [...draft.exposures];
                          const numeric = key === "value" || key === "emi";
                          exposures[index] = { ...row, [key]: numeric ? Number(event.target.value) : event.target.value };
                          patch({ exposures });
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {draft.exposures.length === 0 && (
                <tr>
                  <td colSpan={8}>No facilities recorded.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
          <Button
            variant="secondary"
            onClick={() =>
              patch({
                exposures: [...draft.exposures, { id: uid("ex"), bank: "Emirates NBD", facility: "Working capital", value: 0, emi: 0, status: "Active" }],
              })
            }
          >
            Add facility
          </Button>
        </div>
      )}
      {tab === "Cheque Bounce Details" && (
        <div>
          <div className="fields">
            <Field label="Cheque bounce recorded">
              <select value={draft.chequeBounce} onChange={(event) => patch({ chequeBounce: event.target.value as "Yes" | "No" })}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </Field>
          </div>
          {draft.chequeBounce === "Yes" && (
            <div>
              <DataTable>
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th>Cheque date</th>
                    <th>Cheque amount</th>
                    <th>Bounce count</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.bounces.map((bounce, index) => (
                    <tr key={bounce.id}>
                      <td>
                        <select value={bounce.bank ?? ""} onChange={(event) => {
                          const bounces = [...draft.bounces];
                          bounces[index] = { ...bounce, bank: event.target.value };
                          patch({ bounces });
                        }}>
                          <option value="">Select a bank</option>
                          {BANKS.map((bank) => <option key={bank}>{bank}</option>)}
                        </select>
                        {bounce.bank === "Other" && (
                          <input placeholder="Other bank name" value={bounce.otherBank ?? ""} onChange={(event) => {
                            const bounces = [...draft.bounces];
                            bounces[index] = { ...bounce, otherBank: event.target.value };
                            patch({ bounces });
                          }} />
                        )}
                      </td>
                      <td>
                        <input type="date" value={bounce.date} onChange={(event) => {
                          const bounces = [...draft.bounces];
                          bounces[index] = { ...bounce, date: event.target.value };
                          patch({ bounces });
                        }} />
                      </td>
                      <td>
                        <input value={bounce.amount} onChange={(event) => {
                          const bounces = [...draft.bounces];
                          bounces[index] = { ...bounce, amount: Number(event.target.value) };
                          patch({ bounces });
                        }} />
                      </td>
                      <td>
                        <input value={bounce.bounceCount ?? 0} onChange={(event) => {
                          const bounces = [...draft.bounces];
                          bounces[index] = { ...bounce, bounceCount: Number(event.target.value) };
                          patch({ bounces });
                        }} />
                      </td>
                      <td>
                        <input value={bounce.remarks} onChange={(event) => {
                          const bounces = [...draft.bounces];
                          bounces[index] = { ...bounce, remarks: event.target.value };
                          patch({ bounces });
                        }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <Button
                type="button"
                variant="secondary"
                onClick={() => patch({ bounces: [...draft.bounces, { id: uid("bq"), bank: "Emirates NBD", date: "", amount: 0, bounceCount: 0, status: "", remarks: "" }] })}
              >
                Add cheque bounce
              </Button>
            </div>
          )}
        </div>
      )}
      {tab === "Portal Invitation" && (
        <PortalInvitationPanel state={state} customerId={customer.id} user={user} onChange={replace} onError={setFormError} />
      )}
      {tab === "Activity History" && (
        <DataTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Module</th>
              <th>Record</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {state.audit
              .filter((event) => {
                const blob = `${event.record} ${event.detail ?? ""} ${event.next ?? ""}`;
                return blob.includes(customer.code) || blob.includes(customer.name) || apps.some((app) => blob.includes(app.number));
              })
              .map((event) => (
                <tr key={event.id}>
                  <td>{formatWhen(event.at)}</td>
                  <td>{userName(state, event.actorId)}</td>
                  <td>{event.action}</td>
                  <td>{event.module}</td>
                  <td>{event.record}</td>
                  <td>{event.detail || event.next || "Recorded"}</td>
                </tr>
              ))}
          </tbody>
        </DataTable>
      )}
      </fieldset>
    </div>
  );
}
