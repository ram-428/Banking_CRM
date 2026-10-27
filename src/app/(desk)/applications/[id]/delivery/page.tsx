"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { addDelivery } from "@/lib/actions";
import { aed, formatDate, formatWhen } from "@/lib/format";
import { deliveredTotal } from "@/lib/metrics";
import { useDesk } from "@/lib/store";

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { application, customer } = useRecord(id);
  const banks = [...new Set(state?.submissions.filter((item) => item.applicationId === id).map((item) => item.bank) ?? [])];
  const [bank, setBank] = useState(banks[0] ?? "");
  const [date, setDate] = useState("2026-10-26");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  if (!state || !user || !application || !customer) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const rows = state.deliveries.filter((item) => item.applicationId === id);
  const approved = state.submissions.filter((item) => item.applicationId === id && item.status === "Approved").reduce((sum, item) => sum + (item.approvedAmount ?? 0), 0);

  function save() {
    if (!bank || !amount || Number(amount) <= 0) {
      setError("Bank, date, and value are required.");
      return;
    }
    replace(
      addDelivery(
        state!,
        { applicationId: id, bank, loanType: application!.loanType, date, amount: Number(amount), profilingRef: ref, offerNote, remarks },
        user!,
      ),
    );
    setAmount("");
    setRemarks("");
    setError("");
  }

  return (
    <Gate module="Banks">
    <ApplicationFrame id={id} lede="Partial disbursements are separate records. Nothing is deleted when a later tranche arrives.">
      <dl className="facts" style={{ marginBottom: 18 }}>
        <div>
          <dt>Approved across banks</dt>
          <dd>{aed(approved || undefined)}</dd>
        </div>
        <div>
          <dt>Delivered so far</dt>
          <dd>{aed(deliveredTotal(state, id) || undefined)}</dd>
        </div>
        <div>
          <dt>Document folder</dt>
          <dd>
            <Link href={`/customers/${customer.code}`}>{customer.folderRef}</Link>
          </dd>
        </div>
        <div>
          <dt>Owner / signatory</dt>
          <dd>{customer.contacts.find((item) => item.id === application.ownerContactId)?.name ?? "None"}</dd>
        </div>
      </dl>
      {error && <div className="banner banner-danger">{error}</div>}
      <div className="fields">
        <Field label="Bank delivered" required>
          <select value={bank} onChange={(event) => setBank(event.target.value)}>
            <option value="">Select</option>
            {(banks.length ? banks : ["First Abu Dhabi Bank"]).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Date of delivery" required>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Value of delivery (AED)" required>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="Type of loan">
          <input value={application.loanType} readOnly />
        </Field>
        <Field label="Offer letter">
          <input value={offerNote} onChange={(event) => setOfferNote(event.target.value)} placeholder="Document reference" />
        </Field>
        <Field label="Profiling reference">
          <input value={ref} onChange={(event) => setRef(event.target.value)} />
        </Field>
        <Field label="Remarks" className="span-2">
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </Field>
      </div>
      <div style={{ margin: "12px 0 22px" }}>
        <Button onClick={save}>Record disbursement</Button>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Date</th>
            <th>Bank</th>
            <th>Loan type</th>
            <th>Value</th>
            <th>Recorded</th>
            <th>Last modified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDate(row.date)}</td>
              <td>
                {row.bank}
                <div className="hint">{row.remarks}</div>
              </td>
              <td>{row.loanType}</td>
              <td className="num">{aed(row.amount)}</td>
              <td>
                {userName(state, row.recordedBy)}
                <div className="hint">{formatWhen(row.recordedAt)}</div>
              </td>
              <td>
                {userName(state, row.updatedBy || row.recordedBy)}
                <div className="hint">{formatWhen(row.updatedAt || row.recordedAt)}</div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6}>No funds have been recorded.</td>
            </tr>
          )}
      </tbody>
    </DataTable>
    </ApplicationFrame>
    </Gate>
  );
}
