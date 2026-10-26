"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { uploadDocument } from "@/lib/actions";
import { fileAllowed } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function UploadPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { state, replace } = useStore();
  const router = useRouter();
  const item = state?.checklist.find((row) => row.id === itemId);
  const master = state?.documents.find((doc) => doc.code === item?.documentCode);
  const [fileName, setFileName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  if (!state || !item) return null;
  const previous = state.versions.filter((version) => version.checklistItemId === item.id);
  const latest = previous[0];
  const isStatement = item.documentCode === "DOC-BS";

  function save() {
    if (!fileName) {
      setError("Choose a file.");
      return;
    }
    if (master && !fileAllowed(fileName, master.fileTypes)) {
      setError(`This document accepts ${master.fileTypes.join(", ")}.`);
      return;
    }
    if (master && isStatement && (!periodFrom || !periodTo)) {
      setError("Bank statements need a from and to period.");
      return;
    }
    const result = uploadDocument(state!, {
      checklistItemId: item!.id,
      fileName,
      uploadedBy: state!.portalEmail ?? "Customer",
      issueDate,
      expiryDate,
      periodFrom,
      periodTo,
      reference,
      remarks,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    router.push("/portal/home");
  }

  return (
    <div>
      <header className="portal-bar">
        <Link href="/portal/home">Back to checklist</Link>
        <span className="hint">Private upload</span>
      </header>
      <div className="portal-wrap">
        <h1 style={{ fontSize: 28 }}>{latest ? `Replace ${item.name}` : item.name}</h1>
        <p className="lede">The new file becomes version {(previous.length || 0) + 1} and waits for review. It is not approved on upload.</p>
        {latest?.comments && <div className="banner banner-warn">Last rejection: {latest.rejectionReason}. {latest.comments}</div>}
        {error && <div className="banner banner-danger">{error}</div>}
        <div className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 16 }}>
          <Field label="File" required hint={master ? `Allowed: ${master.fileTypes.join(", ")}. Maximum ${master.maxMb} MB. Files are checked before storage.` : undefined}>
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (master && file.size > master.maxMb * 1024 * 1024) {
                  setError(`File is larger than ${master.maxMb} MB.`);
                  return;
                }
                setFileName(file.name);
                setError("");
              }}
            />
          </Field>
          {fileName && <p className="hint">Selected: {fileName}</p>}
          {item.expiryApplicable && (
            <>
              <Field label="Issue date">
                <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
              </Field>
              <Field label="Expiry date">
                <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
              </Field>
            </>
          )}
          {isStatement && (
            <>
              <Field label="Statement period from" required>
                <input type="month" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
              </Field>
              <Field label="Statement period to" required>
                <input type="month" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
              </Field>
            </>
          )}
          <Field label="Document reference">
            <input value={reference} onChange={(event) => setReference(event.target.value)} />
          </Field>
          <Field label="Remarks">
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button onClick={save}>{latest ? "Submit replacement" : "Submit for review"}</Button>
        </div>
      </div>
    </div>
  );
}
