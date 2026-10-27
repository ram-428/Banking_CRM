"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate, StatusText } from "@/components/ui";
import { userName } from "@/lib/access";
import { saveCredit } from "@/lib/actions";
import { aed, formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { CreditReview } from "@/lib/types";

export default function CreditPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { application, customer } = useRecord(id);
  const [decision, setDecision] = useState<CreditReview["decision"]>("Eligible");
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("");
  const [error, setError] = useState("");

  if (!state || !user || !application || !customer) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const history = state.reviews.filter((item) => item.applicationId === id);
  const flags = customer.statement?.flags ?? [];

  function submit() {
    if (notes.trim().length < 8) {
      setError("Assessment notes are required.");
      return;
    }
    replace(saveCredit(state!, { applicationId: id, decision, notes, conditions }, user!));
    setNotes("");
    setConditions("");
    setError("");
  }

  return (
    <Gate module="Credit">
      <ApplicationFrame id={id} lede={`Decision is stored against ${application.snapshotLabel}. AI findings stay separate from this decision.`}>
      <div className="work">
        <section>
          <h2 className="block-title">Financial summary</h2>
          <dl className="facts">
            <div>
              <dt>Sales turnover</dt>
              <dd>{aed(customer.salesTurnover)}</dd>
            </div>
            <div>
              <dt>Bank turnover</dt>
              <dd>{aed(customer.bankTurnover)}</dd>
            </div>
            <div>
              <dt>POS turnover</dt>
              <dd>{aed(customer.posTurnover)}</dd>
            </div>
            <div>
              <dt>Average balance, 6 / 12</dt>
              <dd>
                {aed(customer.avgBalance6)} / {aed(customer.avgBalance12)}
              </dd>
            </div>
            <div>
              <dt>Existing exposure</dt>
              <dd>{customer.exposures.length ? customer.exposures.map((item) => `${item.bank} ${aed(item.value)}`).join(", ") : "None"}</dd>
            </div>
            <div>
              <dt>Cheque bounce</dt>
              <dd>{customer.chequeBounce}</dd>
            </div>
          </dl>
          <h2 className="block-title" style={{ marginTop: 22 }}>
            AI findings
          </h2>
          {flags.length === 0 && <p className="hint">No open statement flags on this snapshot.</p>}
          {flags.map((flag) => (
            <p key={flag}>{flag}</p>
          ))}
          <h2 className="block-title" style={{ marginTop: 22 }}>
            Earlier decisions
          </h2>
          {history.length === 0 && <p className="hint">No credit decision yet.</p>}
          {history.map((review) => (
            <article key={review.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--color-line)" }}>
              <StatusText value={review.decision} />
              <p>{review.notes}</p>
              {review.conditions && <p className="hint">Conditions: {review.conditions}</p>}
              <p className="hint">
                {userName(state, review.reviewerId)} · {formatWhen(review.reviewedAt)} · {review.profileLabel}
              </p>
            </article>
          ))}
        </section>
        <aside>
          <h2 className="block-title">Record decision</h2>
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
            <Field label="Eligibility" required>
              <select value={decision} onChange={(event) => setDecision(event.target.value as CreditReview["decision"])}>
                <option>Eligible</option>
                <option>Not Eligible</option>
                <option>More Information Required</option>
                <option>On Hold</option>
              </select>
            </Field>
            <Field label="Risk and assessment notes" required>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
            <Field label="Conditions or outstanding items">
              <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} />
            </Field>
          </div>
          <Button onClick={submit}>Submit review</Button>
        </aside>
      </div>
    </ApplicationFrame>
    </Gate>
  );
}
