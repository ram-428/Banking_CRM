"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, ButtonLink, Field } from "@/components/ui";
import { createLead, type LeadInput } from "@/lib/actions";
import { BANKS, EMIRATES, LEAD_STATUSES, LEGAL_TYPES, LOAN_TYPES, LOBS } from "@/lib/constants";
import { possibleDuplicates } from "@/lib/duplicates";
import { useDesk } from "@/lib/store";
import type { Customer } from "@/lib/types";

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
};

export function CreateLeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const { state, replace, user } = useDesk();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<Customer[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) return;
    setForm(empty);
    setErrors({});
    setMatches([]);
    setConfirmed(false);
  }, [open]);

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

  function save() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Company name is required.";
    if (!form.tradeLicense.trim()) next.tradeLicense = "Trade licence is required for duplicate checks.";
    if (!form.lob) next.lob = "Line of business is required.";
    if (!form.contactName.trim()) next.contactName = "Contact name is required.";
    if (!form.mobile.trim()) next.mobile = "Mobile number is required.";
    if (!form.email.includes("@")) next.email = "Enter a valid email.";
    if (!assignee()) next.assignedTo = "Assign a sales executive.";
    if (form.relationship === "Subsidiary" && !form.parentId) next.parentId = "Choose the parent company.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const found = possibleDuplicates(state!.customers, {
      name: form.name,
      tradeLicense: form.tradeLicense,
      email: form.email,
      mobile: form.mobile,
    });
    if (found.length && !confirmed) {
      setMatches(found);
      return;
    }
    const input: LeadInput = {
      ...form,
      employees: form.employees ? Number(form.employees) : undefined,
      requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : undefined,
      assignedTo: assignee(),
      parentId: form.parentId || undefined,
    };
    const result = createLead(state!, input, user!);
    replace(result.state);
    onCreated(result.code);
  }

  return (
    <FormDialog
      open={open}
      wide
      title="Create lead"
      description="Create a lead. Saving generates a customer code and a private folder."
      submitLabel={confirmed ? "Save separate company" : "Create lead"}
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
      <section className="form-section">
        <h2>Company</h2>
        <div className="fields">
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
                {state.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Country">
            <input value={form.country} onChange={(event) => set("country", event.target.value)} />
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
        <h2>Contact</h2>
        <div className="fields">
          <Field label="Contact person" required error={errors.contactName}>
            <input placeholder="Enter the contact name" value={form.contactName} onChange={(event) => set("contactName", event.target.value)} />
          </Field>
          <Field label="Designation">
            <input placeholder="Enter the designation" value={form.designation} onChange={(event) => set("designation", event.target.value)} />
          </Field>
          <Field label="Contact type" required>
            <select value={form.contactType} onChange={(event) => set("contactType", event.target.value as "Owner" | "Signatory" | "Other")}>
              <option>Owner</option>
              <option>Signatory</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Mobile number" required error={errors.mobile}>
            <input placeholder="Enter the mobile number" value={form.mobile} onChange={(event) => set("mobile", event.target.value)} />
          </Field>
          <Field label="Email address" required error={errors.email}>
            <input type="email" placeholder="Enter the email" value={form.email} onChange={(event) => set("email", event.target.value)} />
          </Field>
          <Field label="Alternate number">
            <input placeholder="Enter an alternate number" value={form.alternate} onChange={(event) => set("alternate", event.target.value)} />
          </Field>
          <Field label="Nationality">
            <input placeholder="Enter the nationality" value={form.nationality} onChange={(event) => set("nationality", event.target.value)} />
          </Field>
        </div>
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
          <Field label="Preferred bank">
            <select value={form.preferredBank} onChange={(event) => set("preferredBank", event.target.value)}>
              <option value="">None yet</option>
              {BANKS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Purpose of loan" className="span-2">
            <textarea placeholder="Enter the purpose" value={form.purpose} onChange={(event) => set("purpose", event.target.value)} />
          </Field>
          <Field label="Expected financing date">
            <input type="date" value={form.expectedDate} onChange={(event) => set("expectedDate", event.target.value)} />
          </Field>
          <Field label="Lead source">
            <input placeholder="Enter the lead source" value={form.leadSource} onChange={(event) => set("leadSource", event.target.value)} />
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
          Lead status starts as {LEAD_STATUSES[0]}. Change it on the profile after the first conversation.
        </p>
      </section>
    </FormDialog>
  );
}
