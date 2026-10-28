"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView } from "@/lib/access";
import { addExtraction, reviewExtraction } from "@/lib/actions";
import { useDesk } from "@/lib/store";

export default function AiResultsPage() {
  const { state, replace, user } = useDesk();
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [documentName, setDocumentName] = useState("Trade License");
  const [field, setField] = useState("Sales turnover");
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [message, setMessage] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.versions.filter((row) => {
      if (!row.ai) return false;
      const { application, customer } = applicationView(state, row.applicationId);
      const blob = `${row.fileName} ${row.ai.documentType} ${row.ai.companyName} ${customer?.name ?? ""} ${application?.number ?? ""}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state || !user) return null;

  function prepare() {
    const outcome = addExtraction(state!, { customerId, documentName, field, verifiedValue: "", periodFrom, periodTo }, user!);
    if (outcome.error) setMessage(outcome.error);
    else {
      setMessage("The row is ready for review. Extracted value is blank because no extraction provider is configured.");
      replace(outcome.state);
    }
  }

  function decide(id: string, decision: "Verified" | "Rejected") {
    const outcome = reviewExtraction(state!, id, decision, verified[id] ?? "", user!);
    if (outcome.error) setMessage(outcome.error);
    else {
      setMessage(decision === "Verified" ? "Verified value saved. A later extraction will not replace it." : "Extraction rejected. Enter the figure manually on the customer profile if you still need it.");
      replace(outcome.state);
    }
  }

  return (
    <Gate module="Verification">
      <div className="page">
        <PageHeader title="AI results" lede="Extraction review keeps the extracted value separate from the verified value. Confidence is not shown because no extraction provider is configured." />
        {message && <p className="hint">{message}</p>}
        <section className="panel">
          <h2>Review a document field</h2>
          <p className="hint">Choose the customer document and field. The system does not invent an extracted value or a confidence score.</p>
          <div className="fields">
            <Field label="Customer" required>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Select a customer</option>
                {state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </Field>
            <Field label="Source document" required>
              <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} />
            </Field>
            <Field label="Field" required>
              <select value={field} onChange={(event) => setField(event.target.value)}>
                <option>Company name</option>
                <option>Sales turnover</option>
                <option>POS turnover</option>
                <option>Bank turnover</option>
                <option>VAT amount</option>
                <option>Average balance</option>
              </select>
            </Field>
            <Field label="Period from">
              <input type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
            </Field>
            <Field label="Period to">
              <input type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
            </Field>
            <Button type="button" onClick={prepare}>Prepare review</Button>
          </div>
          <DataTable>
            <thead>
              <tr>
                <th>Source document</th>
                <th>Extracted field</th>
                <th>Extracted value</th>
                <th>Verified value</th>
                <th>Confidence</th>
                <th>Verification status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.extractions.map((row) => {
                const customer = state.customers.find((item) => item.id === row.customerId);
                return (
                  <tr key={row.id}>
                    <td>{row.documentName}<div className="hint">{customer?.name}</div></td>
                    <td>{row.field}</td>
                    <td>{row.extractedValue || "Blank"}</td>
                    <td>
                      <input aria-label={`Verified ${row.field}`} value={verified[row.id] ?? row.verifiedValue} disabled={row.status === "Verified"} onChange={(event) => setVerified((current) => ({ ...current, [row.id]: event.target.value }))} />
                    </td>
                    <td>Unavailable</td>
                    <td><StatusText value={row.status} /></td>
                    <td>
                      {row.status === "Pending Review" && (
                        <div className="row-actions">
                          <Button type="button" onClick={() => decide(row.id, "Verified")}>Verify</Button>
                          <Button type="button" onClick={() => decide(row.id, "Rejected")}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {state.extractions.length === 0 && <tr><td colSpan={7}>No extraction rows yet. Prepare a review to enter the value manually.</td></tr>}
            </tbody>
          </DataTable>
        </section>
        <h2 className="block-title">Earlier sample findings</h2>
        <p className="hint">These rows are stored sample text from the lending desk. They are not a live extraction.</p>
        <div className="filters">
          <input placeholder="Search company, file, or document type" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search AI results" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>File</th>
              <th>Company</th>
              <th>AI document type</th>
              <th>Extracted name</th>
              <th>Number</th>
              <th>Issue / expiry</th>
              <th>Profile match</th>
              <th>Confidence</th>
              <th>Processing</th>
              <th>Reviewer decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { application, customer } = applicationView(state, row.applicationId);
              const ai = row.ai!;
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" href={`/verification/${row.id}`}>
                      {row.fileName}
                    </Link>
                    <div className="hint">
                      {application?.number} · v{row.version}
                    </div>
                  </td>
                  <td>{customer?.name ?? "None"}</td>
                  <td>{ai.documentType}</td>
                  <td>{ai.companyName}</td>
                  <td>{ai.documentNumber}</td>
                  <td>
                    {ai.issueDate || "None"}
                    <div className="hint">{ai.expiryDate || "No expiry"}</div>
                  </td>
                  <td>{ai.match}</td>
                  <td>{ai.confidence}%</td>
                  <td>
                    <StatusText value={ai.processing} />
                    <div className="hint">{ai.findings[0] || "No finding"}</div>
                  </td>
                  <td>{row.status}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No demo AI results match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
