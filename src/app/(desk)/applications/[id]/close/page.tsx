"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate } from "@/components/ui";
import { userName } from "@/lib/access";
import { closeApplication } from "@/lib/actions";
import { aed, formatWhen } from "@/lib/format";
import { deliveredTotal } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { Closure } from "@/lib/types";

const OUTCOMES: Closure["outcome"][] = ["Successfully Disbursed", "Partially Disbursed", "Rejected", "Customer Withdrawn", "Cancelled", "Closed, other"];

export default function ClosePage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { application } = useRecord(id);
  const [outcome, setOutcome] = useState<Closure["outcome"]>("Successfully Disbursed");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  if (!state || !user || !application) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const closure = state.closures.find((item) => item.applicationId === id);
  const approved = state.submissions.filter((item) => item.applicationId === id && item.approvedAmount).reduce((sum, item) => sum + (item.approvedAmount ?? 0), 0);
  const delivered = deliveredTotal(state, id);

  function save() {
    if (remarks.trim().length < 8) {
      setError("Final remarks are required. The file is kept.");
      return;
    }
    const result = closeApplication(
      state!,
      { applicationId: id, outcome, approvedAmount: approved || undefined, deliveredAmount: delivered, reason, remarks },
      user!,
    );
    if (result.error) setError(result.error);
    else {
      replace(result.state);
      setError("");
    }
  }

  return (
    <Gate module="Banks">
    <ApplicationFrame id={id} lede="Closure records the outcome. It does not delete the application, documents, or audit history.">
      <dl className="facts" style={{ marginBottom: 18 }}>
        <div>
          <dt>Approved amount</dt>
          <dd>{aed(approved || undefined)}</dd>
        </div>
        <div>
          <dt>Total delivered</dt>
          <dd>{aed(delivered || undefined)}</dd>
        </div>
        <div>
          <dt>Current status</dt>
          <dd>{application.status}</dd>
        </div>
      </dl>
      {closure ? (
        <div className="banner banner-ok">
          <strong>{closure.outcome}</strong>
          <p>{closure.remarks}</p>
          <p className="hint">
            Closed by {userName(state, closure.closedBy)} · {formatWhen(closure.closedAt)}
          </p>
        </div>
      ) : (
        <>
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            <Field label="Final outcome" required>
              <select value={outcome} onChange={(event) => setOutcome(event.target.value as Closure["outcome"])}>
                {OUTCOMES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Closure reason">
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <Field label="Final remarks" required className="span-2">
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button onClick={save}>Close application</Button>
          </div>
        </>
      )}
    </ApplicationFrame>
    </Gate>
  );
}
