"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate, StatusText } from "@/components/ui";
import { saveAgreement, updateAgreement } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Agreement } from "@/lib/types";

const STATUSES: Agreement["status"][] = ["Draft", "Sent", "Viewed", "Partially Signed", "Completed", "Declined", "Expired", "Failed"];

export default function AgreementPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { customer } = useRecord(id);
  const [type, setType] = useState("Lending Agreement");
  const [doc, setDoc] = useState("Facility agreement");
  const [names, setNames] = useState(customer?.contacts[0]?.name ?? "");
  const [provider, setProvider] = useState("DocuSign");

  if (!state || !user) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const rows = state.agreements.filter((item) => item.applicationId === id);

  return (
    <Gate module="Banks">
    <ApplicationFrame id={id} lede="DocuSign is tracked here. This preview does not call the provider.">
      <div className="banner banner-info">When DocuSign is connected, sent, viewed, and signed states can come from the envelope. Until then, Operations updates the status.</div>
      <div className="fields">
        <Field label="Agreement type" required>
          <input value={type} onChange={(event) => setType(event.target.value)} />
        </Field>
        <Field label="Document" required>
          <input value={doc} onChange={(event) => setDoc(event.target.value)} />
        </Field>
        <Field label="Signatories" required>
          <input value={names} onChange={(event) => setNames(event.target.value)} />
        </Field>
        <Field label="Signing provider">
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option>DocuSign</option>
            <option>Manual</option>
          </select>
        </Field>
      </div>
      <div style={{ margin: "12px 0 24px" }}>
        <Button
          onClick={() =>
            replace(
              saveAgreement(
                state,
                {
                  applicationId: id,
                  type,
                  documentName: doc,
                  provider,
                  recipientNames: names.split(",").map((item) => item.trim()).filter(Boolean),
                  status: provider === "DocuSign" ? "Sent" : "Draft",
                  sentAt: new Date().toISOString(),
                  envelopeId: provider === "DocuSign" ? `ENV-${Math.floor(Math.random() * 90000 + 10000)}` : undefined,
                },
                user,
              ),
            )
          }
        >
          {provider === "DocuSign" ? "Send for signature" : "Save draft"}
        </Button>
      </div>
      {rows.map((row) => (
        <article key={row.id} style={{ padding: "12px 0", borderTop: "1px solid var(--color-line)" }}>
          <strong>{row.type}</strong> · {row.documentName}
          <div style={{ margin: "6px 0" }}>
            <StatusText value={row.status} />
          </div>
          <p className="hint">
            {row.provider}
            {row.envelopeId ? ` · ${row.envelopeId}` : ""} · {row.recipientNames.join(", ")}
            {row.sentAt ? ` · sent ${formatWhen(row.sentAt)}` : ""}
            {row.signedAt ? ` · signed ${formatWhen(row.signedAt)}` : ""}
          </p>
          {row.remarks && <p>{row.remarks}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {STATUSES.map((status) => (
              <Button key={status} variant={status === row.status ? "primary" : "secondary"} onClick={() => replace(updateAgreement(state, row.id, { status, signedAt: status === "Completed" ? new Date().toISOString() : row.signedAt }, user))}>
                {status}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </ApplicationFrame>
    </Gate>
  );
}
