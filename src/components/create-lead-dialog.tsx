"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, ButtonLink, Field } from "@/components/ui";
import { createLead, updateCustomer, type LeadInput } from "@/lib/actions";
import { BANKS, COUNTRIES, EMIRATES, LEAD_SOURCES, LEAD_STATUSES, LEGAL_TYPES, LOAN_TYPES, LOBS, NATIONALITIES } from "@/lib/constants";
import { possibleDuplicates } from "@/lib/duplicates";
import { uid } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Customer } from "@/lib/types";

type ContactDraft = {
  id: string;
  name: string;
  designation: string;
  type: "Owner" | "Signatory" | "Other";
  mobile: string;
  email: string;
  alternate: string;
  nationality: string;
};

function blankContact(type: ContactDraft["type"] = "Owner"): ContactDraft {
  return { id: uid("ct"), name: "", designation: "", type, mobile: "", email: "", alternate: "", nationality: "" };
}

const empty = {
  name: "",
  legalType: "LLC",
  tradeLicense: "",
  startDate: "",
  lob: "Trading",
  activity: "",
  website: "",
  employees: "",
  relationship: "Main" as "Main" | "Subsidiary",
  parentId: "",
  country: "United Arab Emirates",
  emirate: "Dubai",
  address: "",
  tenancy: "No" as "Yes" | "No",
  contactName: "",
  designation: "",
  contactType: "Owner" as "Owner" | "Signatory" | "Other",
  mobile: "",
  email: "",
  alternate: "",
  nationality: "",
  service: "Lending Assistance",
  loanType: "",
  requestedAmount: "",
  preferredBank: "",
  purpose: "",
  expectedDate: "",
  leadSource: "",
  channel: "",
  assignedTo: "",
  remarks: "",
  otherBank: "",
};

export function CreateLeadDialog({
  open,
  customer,
  readOnly,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer?: Customer | null;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (code: string) => void;
}) {
  const { state, replace, user } = useDesk();
  const [form, setForm] = useState(empty);
  const [contacts, setContacts] = useState<ContactDraft[]>([blankContact()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<Customer[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(empty);
      setContacts([blankContact()]);
      setErrors({});
      setMatches([]);
      setConfirmed(false);
      return;
    }
    if (!customer) return;
    const knownBank = BANKS.includes(customer.preferredBank ?? "");
    setForm({
      ...empty,
      name: customer.name,
      legalType: customer.legalType,
      tradeLicense: customer.tradeLicense,
      startDate: customer.startDate ?? "",
      lob: customer.lob,
      activity: customer.activity ?? "",
      website: customer.website ?? "",
      employees: customer.employees ? String(customer.employees) : "",
      relationship: customer.relationship,
      parentId: customer.parentId ?? "",
      country: customer.country,
      emirate: customer.emirate,
      address: customer.address,
      tenancy: customer.tenancy,
      service: customer.service,
      loanType: customer.loanType ?? "",
      requestedAmount: customer.requestedAmount ? String(customer.requestedAmount) : "",
      preferredBank: !customer.preferredBank ? "" : knownBank ? customer.preferredBank : "Other",
      otherBank: !customer.preferredBank || knownBank ? "" : customer.preferredBank,
      purpose: customer.purpose ?? "",
      expectedDate: customer.expectedDate ?? "",
      leadSource: customer.leadSource ?? "",
      channel: customer.channel ?? "",
      assignedTo: customer.assignedTo,
      remarks: customer.remarks ?? "",
    });
    setContacts(
      customer.contacts.map((item) => ({
        id: item.id,
        name: item.name,
        designation: item.designation ?? "",
        type: item.type,
        mobile: item.mobile,
        email: item.email,
        alternate: item.alternate ?? "",
        nationality: item.nationality ?? "",
      })),
    );
  }, [open, customer]);

  if (!state || !user) return null;
  const sales = state.users.filter((item) => item.role === "Sales" && item.status === "Active");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
    setMatches([]);
  }

  function assignee() {
    return form.assignedTo || (user?.role === "Sales" ? user.id : "");
  }

  function bankName() {
    if (form.preferredBank === "Other") return form.otherBank.trim();
    return form.preferredBank;
  }

  function patchContact(index: number, partial: Partial<ContactDraft>) {
    setContacts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...partial } : item)));
    setConfirmed(false);
    setMatches([]);
  }

  function save() {
    if (readOnly) return;
    const primary = contacts[0];
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Company name is required.";
    if (!form.tradeLicense.trim()) next.tradeLicense = "Trade licence is required for duplicate checks.";
    if (!form.lob) next.lob = "Line of business is required.";
    if (!primary?.name.trim() || !primary.mobile.trim() || !primary.email.includes("@")) next.contactName = "Each contact needs a name, mobile number, and email.";
    if (contacts.some((item) => !item.name.trim() || !item.mobile.trim() || !item.email.includes("@"))) next.contactName = "Each contact needs a name, mobile number, and email.";
    if (!assignee()) next.assignedTo = "Assign a sales executive.";
    if (form.relationship === "Subsidiary" && !form.parentId) next.parentId = "Choose the parent company.";
    if (form.preferredBank === "Other" && !form.otherBank.trim()) next.preferredBank = "Enter the bank name.";
    setErrors(next);
    if (Object.keys(next).length || !primary) return;
    const found = possibleDuplicates(state!.customers, {
      name: form.name,
      tradeLicense: form.tradeLicense,
      email: primary.email,
      mobile: primary.mobile,
    }).filter((item) => item.id !== customer?.id);
    if (found.length && !confirmed && !customer) {
      setMatches(found);
      return;
    }
    const shared = {
      name: form.name.trim(),
      legalType: form.legalType,
      tradeLicense: form.tradeLicense.trim(),
      startDate: form.startDate || undefined,
      lob: form.lob,
      activity: form.activity,
      website: form.website,
      employees: form.employees ? Number(form.employees) : undefined,
      relationship: form.relationship,
      parentId: form.relationship === "Subsidiary" ? form.parentId || undefined : undefined,
      country: form.country,
      emirate: form.emirate,
      address: form.address,
      tenancy: form.tenancy,
      service: form.service,
      loanType: form.loanType || undefined,
      requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : undefined,
      preferredBank: bankName() || undefined,
      purpose: form.purpose,
      expectedDate: form.expectedDate || undefined,
      leadSource: form.leadSource,
      channel: form.channel,
      assignedTo: assignee(),
      remarks: form.remarks,
    };
    if (customer) {
      replace(
        updateCustomer(
          state!,
          customer.id,
          {
            ...shared,
            contacts: contacts.map((item) => ({
              id: item.id,
              name: item.name.trim(),
              designation: item.designation,
              type: item.type,
              mobile: item.mobile.trim(),
              email: item.email.trim(),
              alternate: item.alternate,
              nationality: item.nationality,
            })),
          },
          user!,
          "Lead updated.",
        ),
      );
      onSaved(customer.code);
      return;
    }
    const input: LeadInput = {
      ...shared,
      startDate: form.startDate,
      address: form.address,
      contactName: primary.name,
      designation: primary.designation,
      contactType: primary.type,
      mobile: primary.mobile,
      email: primary.email,
      alternate: primary.alternate,
      nationality: primary.nationality,
      assignedTo: assignee(),
      extraContacts: contacts.slice(1),
    };
    const result = createLead(state!, input, user!);
    replace(result.state);
    onSaved(result.code);
  }

  return (
    <FormDialog
      open={open}
      wide
      readOnly={readOnly}
      title={readOnly ? "View lead" : customer ? "Edit lead" : "Create lead"}
      description={
        customer
          ? `${customer.code} · ${customer.folderRef}. The customer code and folder stay fixed.`
          : "Create a lead. Saving generates a customer code and a private folder, then opens the customer profile."
      }
      submitLabel={customer ? "Save lead" : confirmed ? "Save separate company" : "Create lead"}
      onClose={onClose}
      onSubmit={save}
    >
      {matches.length > 0 && (
        <div className="banner banner-warn">
          <strong>Possible duplicate</strong>
          <p>Review the matches before creating another company. A shared contact is not merged automatically.</p>
          <ul>
            {matches.map((match) => (
              <li key={match.id}>
                <ButtonLink href={`/customers/${match.code}`} variant="ghost">
                  {match.name} · {match.code} · {match.tradeLicense}
                </ButtonLink>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirmed(true);
              setMatches([]);
            }}
          >
            Save as a separate company
          </Button>
        </div>
      )}
      <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0 }}>
      <section className="form-section">
        <h2>Company</h2>
        <div className="fields">
          {customer && (
            <Field label="Customer code" hint="Generated by the system and cannot be changed.">
              <input value={customer.code} readOnly />
            </Field>
          )}
          <Field label="Company name" required error={errors.name}>
            <input placeholder="Enter the company name" value={form.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <Field label="Legal type" required>
            <select value={form.legalType} onChange={(event) => set("legalType", event.target.value)}>
              {LEGAL_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Trade licence number" required error={errors.tradeLicense}>
            <input placeholder="Enter the trade licence" value={form.tradeLicense} onChange={(event) => set("tradeLicense", event.target.value)} />
          </Field>
          <Field label="Company start date">
            <input type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} />
          </Field>
          <Field label="Line of business" required error={errors.lob}>
            <select value={form.lob} onChange={(event) => set("lob", event.target.value)}>
              {LOBS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(event) => set("website", event.target.value)} placeholder="https://" />
          </Field>
          <Field label="Business activity" className="span-2">
            <textarea placeholder="Enter the business activity" value={form.activity} onChange={(event) => set("activity", event.target.value)} />
          </Field>
          <Field label="Relationship">
            <select value={form.relationship} onChange={(event) => set("relationship", event.target.value as "Main" | "Subsidiary")}>
              <option>Main</option>
              <option>Subsidiary</option>
            </select>
          </Field>
          {form.relationship === "Subsidiary" && (
            <Field label="Parent company" required error={errors.parentId}>
              <select value={form.parentId} onChange={(event) => set("parentId", event.target.value)}>
                <option value="">Select</option>
                {state.customers
                  .filter((item) => item.id !== customer?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.code}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Country">
            <select value={form.country} onChange={(event) => set("country", event.target.value)}>
              {(COUNTRIES.includes(form.country) ? COUNTRIES : [form.country, ...COUNTRIES]).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Emirate">
            <select value={form.emirate} onChange={(event) => set("emirate", event.target.value)}>
              {EMIRATES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Office address" className="span-2">
            <textarea placeholder="Enter the office address" value={form.address} onChange={(event) => set("address", event.target.value)} />
          </Field>
          <Field label="Tenancy contract available">
            <select value={form.tenancy} onChange={(event) => set("tenancy", event.target.value as "Yes" | "No")}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </Field>
          <Field label="Employees">
            <input placeholder="Enter the employee count" value={form.employees} onChange={(event) => set("employees", event.target.value)} inputMode="numeric" />
          </Field>
        </div>
      </section>
      <section className="form-section">
        <h2>Contact person</h2>
        {errors.contactName && <div className="banner banner-danger">{errors.contactName}</div>}
        {contacts.map((contact, index) => (
          <div key={contact.id} className="fields" style={{ marginBottom: 14 }}>
            <Field label="Contact person name" required>
              <input placeholder="Enter the contact name" value={contact.name} onChange={(event) => patchContact(index, { name: event.target.value })} />
            </Field>
            <Field label="Designation">
              <input placeholder="Enter the designation" value={contact.designation} onChange={(event) => patchContact(index, { designation: event.target.value })} />
            </Field>
            <Field label="Contact type" required>
              <select value={contact.type} onChange={(event) => patchContact(index, { type: event.target.value as ContactDraft["type"] })}>
                <option>Owner</option>
                <option>Signatory</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Mobile number" required>
              <input placeholder="Enter the mobile number" value={contact.mobile} onChange={(event) => patchContact(index, { mobile: event.target.value })} />
            </Field>
            <Field label="Email address" required>
              <input type="email" placeholder="Enter the email" value={contact.email} onChange={(event) => patchContact(index, { email: event.target.value })} />
            </Field>
            <Field label="Alternate contact number">
              <input placeholder="Enter an alternate number" value={contact.alternate} onChange={(event) => patchContact(index, { alternate: event.target.value })} />
            </Field>
            <Field label="Nationality">
              <select value={contact.nationality} onChange={(event) => patchContact(index, { nationality: event.target.value })}>
                <option value="">Select</option>
                {(contact.nationality && !NATIONALITIES.includes(contact.nationality) ? [contact.nationality, ...NATIONALITIES] : NATIONALITIES).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            {contacts.length > 1 && !readOnly && (
              <div>
                <Button type="button" variant="ghost" onClick={() => setContacts((current) => current.filter((item) => item.id !== contact.id))}>
                  Remove contact
                </Button>
              </div>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button type="button" variant="secondary" onClick={() => setContacts((current) => [...current, blankContact("Other")])}>
            Add contact
          </Button>
        )}
      </section>
      <section className="form-section">
        <h2>Initial lending requirement</h2>
        <div className="fields">
          <Field label="Required service" required>
            <select value={form.service} onChange={(event) => set("service", event.target.value)}>
              <option>Lending Assistance</option>
            </select>
          </Field>
          <Field label="Loan type">
            <select value={form.loanType} onChange={(event) => set("loanType", event.target.value)}>
              <option value="">Decide later</option>
              {LOAN_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Requested amount (AED)">
            <input placeholder="Enter the amount" value={form.requestedAmount} onChange={(event) => set("requestedAmount", event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Preferred bank" error={errors.preferredBank}>
            <select value={form.preferredBank} onChange={(event) => set("preferredBank", event.target.value)}>
              <option value="">None yet</option>
              {BANKS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          {form.preferredBank === "Other" && (
            <Field label="Bank name" required error={errors.preferredBank}>
              <input placeholder="Enter the bank name" value={form.otherBank} onChange={(event) => set("otherBank", event.target.value)} />
            </Field>
          )}
          <Field label="Purpose of loan" className="span-2">
            <textarea placeholder="Enter the purpose" value={form.purpose} onChange={(event) => set("purpose", event.target.value)} />
          </Field>
          <Field label="Expected financing date">
            <input type="date" value={form.expectedDate} onChange={(event) => set("expectedDate", event.target.value)} />
          </Field>
          <Field label="Lead source">
            <select value={form.leadSource} onChange={(event) => set("leadSource", event.target.value)}>
              <option value="">Select</option>
              {(form.leadSource && !LEAD_SOURCES.includes(form.leadSource) ? [form.leadSource, ...LEAD_SOURCES] : LEAD_SOURCES).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Channel name">
            <input placeholder="Enter the channel" value={form.channel} onChange={(event) => set("channel", event.target.value)} />
          </Field>
          <Field label="Assigned sales executive" required error={errors.assignedTo}>
            <select value={form.assignedTo || (user.role === "Sales" ? user.id : "")} onChange={(event) => set("assignedTo", event.target.value)}>
              <option value="">Select</option>
              {sales.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Remarks" className="span-2">
            <textarea placeholder="Enter the remarks" value={form.remarks} onChange={(event) => set("remarks", event.target.value)} />
          </Field>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {customer ? "Lead status is maintained on the customer profile." : `Lead status starts as ${LEAD_STATUSES[0]}. Change it on the profile after the first conversation.`}
        </p>
      </section>
      </fieldset>
    </FormDialog>
  );
}
