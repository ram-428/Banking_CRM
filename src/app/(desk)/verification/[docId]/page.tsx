"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { correctAi, reviewDocument } from "@/lib/actions";
import { REJECTION_REASONS } from "@/lib/constants";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function ReviewPage() {
  const { docId } = useParams<{ docId: string }>();
  const { state, replace, user } = useDesk();
  const version = state?.versions.find((item) => item.id === docId);
  const item = state?.checklist.find((row) => row.id === version?.checklistItemId);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [comments, setComments] = useState("");
  const [issueDate, setIssueDate] = useState(version?.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(version?.expiryDate ?? "");
  const [exceptionReason, setExceptionReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [correction, setCorrection] = useState(version?.ai?.companyName ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!version) return;
    setIssueDate(version.issueDate ?? "");
    setExpiryDate(version.expiryDate ?? "");
    setCorrection(version.ai?.companyName ?? "");
  }, [version]);

  if (!state || !user || !version || !item) {
    return (
      <Gate module="Verification">
        <div className="page">
          <PageHeader title="Version not found" />
        </div>
      </Gate>
    );
  }
  const app = state.applications.find((row) => row.id === version.applicationId);
  const customer = state.customers.find((row) => row.id === app?.customerId);
  const history = state.versions.filter((row) => row.checklistItemId === item.id);
  const expired = Boolean(expiryDate && new Date(expiryDate) < new Date());

  function submit() {
    const result = reviewDocument(
      state!,
      { versionId: version!.id, decision, rejectionReason: reason, comments, issueDate, expiryDate, exceptionReason, notify },
      user!,
    );
    if (result.error) setError(result.error);
    else {
      replace(result.state);
      setError("");
      setDone(decision === "Approved" ? "This version is approved." : "Rejection saved. The customer can resubmit.");
    }
  }

  return (
    <Gate module="Verification">
      <div className="page">
        <PageHeader
          crumbs={[{ href: "/verification", label: "Verification" }, { label: `${item.name} v${version.version}` }]}
          title={item.name}
          lede={`${customer?.name ?? ""} · ${app?.number ?? ""} · ${customer?.code ?? ""}`}
        />
        <div className="review-grid">
          <section>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Button variant="secondary" onClick={() => setPage(1)} disabled={page === 1}>
                Page 1
              </Button>
              <Button variant="secondary" onClick={() => setPage(2)}>
                Page 2
              </Button>
              <Button variant="secondary" onClick={() => setZoom((value) => Math.min(1.4, value + 0.1))}>
                Zoom in
              </Button>
              <Button variant="secondary" onClick={() => setZoom((value) => Math.max(0.9, value - 0.1))}>
                Zoom out
              </Button>
            </div>
            <article className="sheet" style={{ fontSize: `${zoom}rem` }}>
              <p className="hint">Private file · {version.fileName}</p>
              <h3>{page === 1 ? item.name : "Continuation"}</h3>
              <p>
                {customer?.name}. Uploaded by {version.uploadedBy} on {formatWhen(version.uploadedAt)}.
              </p>
              <div className="lines" aria-hidden>
                <i style={{ width: "92%" }} />
                <i style={{ width: "80%" }} />
                <i style={{ width: "88%" }} />
                <i style={{ width: page === 1 ? "70%" : "40%" }} />
                <i style={{ width: "84%" }} />
              </div>
              <dl className="facts" style={{ marginTop: 28, gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <dt>Reference</dt>
                  <dd>{version.reference || version.ai?.documentNumber || "Not captured"}</dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>{version.periodFrom ? `${version.periodFrom} to ${version.periodTo}` : "Not a statement"}</dd>
                </div>
              </dl>
            </article>
          </section>
          <aside>
            <h2 className="block-title">Reviewer decision</h2>
            <p className="hint" style={{ marginBottom: 10 }}>
              Current status: {version.status}
              {version.reviewerId ? ` · ${userName(state, version.reviewerId)}` : ""}
            </p>
            {error && <div className="banner banner-danger">{error}</div>}
            {done && <div className="banner banner-ok">{done}</div>}
            <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
              <Field label="Issue date">
                <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
              </Field>
              <Field label="Expiry date">
                <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
              </Field>
              {expired && (
                <Field label="Exception reason" hint="Expired documents do not satisfy a mandatory item unless this is recorded.">
                  <textarea value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} />
                </Field>
              )}
              <Field label="Decision" required>
                <select value={decision} onChange={(event) => setDecision(event.target.value as "Approved" | "Rejected")}>
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </Field>
              {decision === "Rejected" && (
                <>
                  <Field label="Rejection reason" required>
                    <select value={reason} onChange={(event) => setReason(event.target.value)}>
                      {REJECTION_REASONS.map((itemName) => (
                        <option key={itemName}>{itemName}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Correction instructions" required>
                    <textarea value={comments} onChange={(event) => setComments(event.target.value)} />
                  </Field>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
                    Notify the customer to resubmit
                  </label>
                </>
              )}
            </div>
            <Button onClick={submit}>{decision === "Approved" ? "Approve this version" : "Reject and request resubmission"}</Button>

            <h2 className="block-title" style={{ marginTop: 28 }}>
              AI result
            </h2>
            <p className="hint">This is not the approval. Correcting a value does not approve the file.</p>
            {version.ai ? (
              <div style={{ marginTop: 8 }}>
                <StatusText value={version.ai.processing} />
                <dl className="facts" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
                  <div>
                    <dt>Extracted name</dt>
                    <dd>{version.ai.companyName}</dd>
                  </div>
                  <div>
                    <dt>Number</dt>
                    <dd>{version.ai.documentNumber}</dd>
                  </div>
                  <div>
                    <dt>Profile match</dt>
                    <dd>{version.ai.match}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{Math.round(version.ai.confidence * 100)}%</dd>
                  </div>
                </dl>
                {version.ai.findings.map((finding) => (
                  <p key={finding}>{finding}</p>
                ))}
                <Field label="Correct extracted name">
                  <input value={correction} onChange={(event) => setCorrection(event.target.value)} />
                </Field>
                <Button variant="secondary" onClick={() => replace(correctAi(state, version.id, correction, user))}>
                  Save correction
                </Button>
              </div>
            ) : (
              <p>AI extraction is off for this document.</p>
            )}
          </aside>
        </div>
        <h2 className="block-title" style={{ marginTop: 28 }}>
          Version history
        </h2>
        <DataTable>
          <thead>
            <tr>
              <th>Version</th>
              <th>File</th>
              <th>Uploaded</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/verification/${row.id}`}>v{row.version}</Link>
                </td>
                <td>{row.fileName}</td>
                <td>
                  {row.uploadedBy}
                  <div className="hint">{formatWhen(row.uploadedAt)}</div>
                </td>
                <td>
                  <StatusText value={row.status} />
                  {row.rejectionReason && <div className="hint">{row.rejectionReason}. {row.comments}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
