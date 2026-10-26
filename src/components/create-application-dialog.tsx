"use client";

import { useEffect, useMemo, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field } from "@/components/ui";
import { createApplication } from "@/lib/actions";
import { BANKS, LOAN_TYPES } from "@/lib/constants";
import { useDesk } from "@/lib/store";

export function CreateApplicationDialog({
  open,
  presetCustomerId = "",
  onClose,
  onCreated,
}: {
  open: boolean;
  presetCustomerId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { state, replace, user } = useDesk();
  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [query, setQuery] = useState("");
  const [ownerContactId, setOwnerContactId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loanType, setLoanType] = useState("Business Loan");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [banks, setBanks] = useState<string[]>([]);
  const [tenure, setTenure] = useState("");
  const [financingDate, setFinancingDate] = useState("");
  const [channel, setChannel] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCustomerId(presetCustomerId);
    setQuery("");
    setOwnerContactId("");
    setAssignedTo("");
    setLoanType("Business Loan");
    setAmount("");
    setPurpose("");
    setBanks([]);
    setTenure("");
    setFinancingDate("");
    setChannel("");
    setRemarks("");
    setError("");
  }, [open, presetCustomerId]);

  const matches = useMemo(() => {
    if (!state || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return state.customers.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q)).slice(0, 6);
  }, [query, state]);

  if (!state || !user) return null;
  const customer = state.customers.find((item) => item.id === customerId);
  const contactId = ownerContactId || customer?.contacts[0]?.id || "";
  const contact = customer?.contacts.find((item) => item.id === contactId);
  const salesId = assignedTo || (user.role === "Sales" ? user.id : customer?.assignedTo || "");

  function toggleBank(bank: string) {
    setBanks((current) => (current.includes(bank) ? current.filter((item) => item !== bank) : [...current, bank]));
  }

  function save() {
    if (!customer || !contact) {
      setError("Select an existing customer.");
      return;
    }
    if (!purpose.trim() || !amount || Number(amount) <= 0) {
      setError("Loan type, amount, and purpose are required.");
      return;
    }
    const result = createApplication(
      state!,
      {
        customerId: customer.id,
        ownerContactId: contact.id,
        assignedTo: salesId,
        channel,
        loanType,
        amount: Number(amount),
        purpose,
        preferredBanks: banks,
        tenureMonths: tenure ? Number(tenure) : undefined,
        financingDate: financingDate || undefined,
        remarks,
      },
      user!,
    );
    replace(result.state);
    onCreated(result.id);
  }

  return (
    <FormDialog
      open={open}
      wide
      title="Create application"
      description="Create a lending application. The checklist is copied from the active document rules and stays fixed on this file."
      submitLabel="Create application"
      onClose={onClose}
      onSubmit={save}
    >
      {error && <div className="banner banner-danger">{error}</div>}
      <section className="form-section">
        <h2>Customer</h2>
        {!customer && (
          <Field label="Find customer" required>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or customer code" />
          </Field>
        )}
        {matches.length > 0 && !customer && (
          <div className="pick-list">
            {matches.map((item) => (
              <button key={item.id} type="button" onClick={() => setCustomerId(item.id)}>
                {item.name}
                <div className="hint">{item.code}</div>
              </button>
            ))}
          </div>
        )}
        {customer && contact && (
          <>
            <dl className="facts">
              <div>
                <dt>Company</dt>
                <dd>{customer.name}</dd>
              </div>
              <div>
                <dt>Code</dt>
                <dd>{customer.code}</dd>
              </div>
              <div>
                <dt>Owner or signatory</dt>
                <dd>{contact.name}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{contact.mobile}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{contact.email}</dd>
              </div>
              <div>
                <dt>Folder</dt>
                <dd>{customer.folderRef}</dd>
              </div>
            </dl>
            <Button type="button" variant="ghost" onClick={() => setCustomerId("")}>
              Choose a different company
            </Button>
          </>
        )}
        {customer && customer.contacts.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <Field label="Owner or signatory">
              <select value={contactId} onChange={(event) => setOwnerContactId(event.target.value)}>
                {customer.contacts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </section>
      <section className="form-section">
        <h2>Loan requirement</h2>
        <div className="fields">
          <Field label="Lending service" required>
            <input value="Lending Assistance" readOnly />
          </Field>
          <Field label="Type of loan" required>
            <select value={loanType} onChange={(event) => setLoanType(event.target.value)}>
              {LOAN_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Requested amount (AED)" required>
            <input placeholder="Enter the amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Assigned sales executive" required>
            <select value={salesId} onChange={(event) => setAssignedTo(event.target.value)}>
              {state.users
                .filter((item) => item.role === "Sales")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Loan purpose" required className="span-2">
            <textarea placeholder="Enter the purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </Field>
          <Field label="Preferred banks" className="span-2">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BANKS.map((bank) => (
                <label key={bank} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={banks.includes(bank)} onChange={() => toggleBank(bank)} />
                  {bank}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Expected tenure (months)">
            <input placeholder="Enter the tenure" value={tenure} onChange={(event) => setTenure(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Required financing date">
            <input type="date" value={financingDate} onChange={(event) => setFinancingDate(event.target.value)} />
          </Field>
          <Field label="Channel">
            <input placeholder="Enter the channel" value={channel} onChange={(event) => setChannel(event.target.value)} />
          </Field>
          <Field label="Remarks" className="span-2">
            <textarea placeholder="Enter the remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
        </div>
      </section>
    </FormDialog>
  );
}
