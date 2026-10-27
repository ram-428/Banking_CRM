"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate, StatusText } from "@/components/ui";
import { addSubmission, updateSubmission } from "@/lib/actions";
import { BANKS, LOAN_TYPES, SUBMISSION_STATUSES } from "@/lib/constants";
import { aed, formatDate } from "@/lib/format";
import { submissionBlockers } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { BankSubmission } from "@/lib/types";

export default function BanksPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { application } = useRecord(id);
  const [open, setOpen] = useState<string | null>(null);
  const [bank, setBank] = useState("Emirates NBD");
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState("");
  const [loanType, setLoanType] = useState(application?.loanType ?? "Business Loan");
  const [date, setDate] = useState("2026-10-26");
  const [branch, setBranch] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [documentsNote, setDocumentsNote] = useState("");
  const [status, setStatus] = useState<BankSubmission["status"]>("Submitted");
  const [remarks, setRemarks] = useState("");
  const [override, setOverride] = useState("");
  const [error, setError] = useState("");
  const [response, setResponse] = useState({
    date: "",
    status: "Under Bank Review" as BankSubmission["status"],
    approvedAmount: "",
    rate: "",
    tenure: "",
    emi: "",
    offerNote: "",
    additionalRequest: "",
    remarks: "",
  });

  if (!state || !user || !application) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const rows = state.submissions.filter((item) => item.applicationId === id);
  const blockers = submissionBlockers(state, id);

  function save() {
    const name = bank === "Other" ? other.trim() : bank;
    if (!name || !amount || Number(amount) <= 0) {
      setError("Bank, amount, and submission date are required.");
      return;
    }
    const result = addSubmission(
      state!,
      {
        applicationId: id,
        bank: name,
        branch,
        manager,
        phone,
        email,
        documentsNote,
        remarks,
        submittedOn: date,
        amount: Number(amount),
        loanType,
        status,
        overrideReason: override,
      },
      user!,
      blockers,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    setError("");
    setAmount("");
    setOverride("");
  }

  function respond(row: BankSubmission) {
    if (!response.date || !response.status) {
      setError("Response date and status are required.");
      return;
    }
    if (response.status === "Approved" && (!response.approvedAmount || Number(response.approvedAmount) <= 0)) {
      setError("An approved response needs the approved loan amount.");
      return;
    }
    replace(
      updateSubmission(
        state!,
        row.id,
        {
          status: response.status,
          responseDate: response.date,
          responseStatus: response.status,
          approvedAmount: response.approvedAmount ? Number(response.approvedAmount) : undefined,
          rate: response.rate ? Number(response.rate) : undefined,
          tenure: response.tenure ? Number(response.tenure) : undefined,
          emi: response.emi ? Number(response.emi) : undefined,
          offerNote: response.offerNote,
          additionalRequest: response.additionalRequest,
          remarks: response.remarks || row.remarks,
        },
        user!,
      ),
    );
    setError("");
    setOpen(null);
  }

  return (
    <Gate module="Banks">
    <ApplicationFrame id={id} lede="Each bank is its own record. The application status does not copy a single bank.">
      {blockers.length > 0 && (
        <div className="banner banner-warn">
          <strong>Submission checks are open.</strong>
          <ul>
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>An authorised override is stored on the submission and in the audit history.</p>
        </div>
      )}
      {error && <div className="banner banner-danger">{error}</div>}
      <section className="form-section">
        <h2>New submission</h2>
        <div className="fields">
          <Field label="Bank" required>
            <select value={bank} onChange={(event) => setBank(event.target.value)}>
              {BANKS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          {bank === "Other" && (
            <Field label="Bank name" required>
              <input value={other} onChange={(event) => setOther(event.target.value)} />
            </Field>
          )}
          <Field label="Applied amount (AED)" required>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Type of loan" required>
            <select value={loanType} onChange={(event) => setLoanType(event.target.value)}>
              {LOAN_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Submission date" required>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Branch">
            <input value={branch} onChange={(event) => setBranch(event.target.value)} />
          </Field>
          <Field label="Relationship manager">
            <input value={manager} onChange={(event) => setManager(event.target.value)} />
          </Field>
          <Field label="Bank phone">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Bank email">
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Submission status" required>
            <select value={status} onChange={(event) => setStatus(event.target.value as BankSubmission["status"])}>
              {SUBMISSION_STATUSES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Supporting documents" className="span-2">
            <textarea value={documentsNote} onChange={(event) => setDocumentsNote(event.target.value)} placeholder="Document references for this submission" />
          </Field>
          <Field label="Remarks" className="span-2">
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
          {blockers.length > 0 && (
            <Field label="Override reason" className="span-2" hint="Required only when checks are still open.">
              <textarea value={override} onChange={(event) => setOverride(event.target.value)} />
            </Field>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={save}>Record submission</Button>
        </div>
      </section>
      <h2 className="block-title">Submissions</h2>
      {rows.map((row) => (
        <article key={row.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--color-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>
                {row.reference} · {row.bank}
              </strong>
              <div className="hint">
                {formatDate(row.submittedOn)} · {aed(row.amount)} · {row.loanType}
                {row.overrideReason ? ` · Override: ${row.overrideReason}` : ""}
              </div>
            </div>
            <StatusText value={row.status} />
          </div>
          {row.approvedAmount != null && (
            <p style={{ marginTop: 8 }}>
              Approved {aed(row.approvedAmount)}
              {row.rate ? ` at ${row.rate}%` : ""}
              {row.tenure ? ` for ${row.tenure} months` : ""}
              {row.offerNote ? ` · ${row.offerNote}` : ""}
            </p>
          )}
          {row.additionalRequest && <p>Bank asked for: {row.additionalRequest}</p>}
          <button className="btn btn-ghost" type="button" onClick={() => setOpen(open === row.id ? null : row.id)}>
            {open === row.id ? "Hide response" : "Record response"}
          </button>
          {open === row.id && (
            <div className="fields" style={{ marginTop: 12 }}>
              <Field label="Response date" required>
                <input type="date" value={response.date} onChange={(event) => setResponse({ ...response, date: event.target.value })} />
              </Field>
              <Field label="Response status" required>
                <select value={response.status} onChange={(event) => setResponse({ ...response, status: event.target.value as BankSubmission["status"] })}>
                  {SUBMISSION_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Approved loan amount (AED)" required={response.status === "Approved"}>
                <input value={response.approvedAmount} onChange={(event) => setResponse({ ...response, approvedAmount: event.target.value })} />
              </Field>
              <Field label="Approved interest / profit rate (%)">
                <input value={response.rate} onChange={(event) => setResponse({ ...response, rate: event.target.value })} />
              </Field>
              <Field label="Approved tenure (months)">
                <input value={response.tenure} onChange={(event) => setResponse({ ...response, tenure: event.target.value })} />
              </Field>
              <Field label="Approved EMI (AED)">
                <input value={response.emi} onChange={(event) => setResponse({ ...response, emi: event.target.value })} />
              </Field>
              <Field label="Approval / offer letter" className="span-2">
                <input value={response.offerNote} onChange={(event) => setResponse({ ...response, offerNote: event.target.value })} placeholder="Document reference" />
              </Field>
              <Field label="Additional document request" className="span-2" hint="Saving this adds a bank-specific checklist item.">
                <textarea value={response.additionalRequest} onChange={(event) => setResponse({ ...response, additionalRequest: event.target.value })} />
              </Field>
              <Field label="Remarks" className="span-2">
                <textarea value={response.remarks} onChange={(event) => setResponse({ ...response, remarks: event.target.value })} />
              </Field>
              <div className="span-2">
                <Button onClick={() => respond(row)}>Save bank response</Button>
              </div>
            </div>
          )}
        </article>
      ))}
      {rows.length === 0 && <p className="hint">No submissions yet.</p>}
    </ApplicationFrame>
    </Gate>
  );
}
