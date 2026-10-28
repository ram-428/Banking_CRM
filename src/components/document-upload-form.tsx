"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import type { DocumentUploadInput } from "@/lib/actions";
import { fileAllowed } from "@/lib/format";
import { isPeriodBased, readFileForStore, sizeLabel } from "@/lib/service-documents";
import type { DocumentMaster, ServiceChecklistItem } from "@/lib/types";

type ReceivedThrough = "Email" | "In Person" | "Other";

/**
 * One upload form for the customer portal (5.5) and the internal upload (5.9).
 * Context fields are read-only. Employees get one extra field: Received Through.
 */
export function DocumentUploadForm({
  item,
  master,
  context,
  internal,
  onSubmit,
  onCancel,
}: {
  item: ServiceChecklistItem;
  master?: DocumentMaster;
  context: { label: string; value: string }[];
  internal?: boolean;
  onSubmit: (input: DocumentUploadInput, receivedThrough?: ReceivedThrough) => string | void;
  onCancel: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [received, setReceived] = useState<ReceivedThrough>("Email");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [sending, setSending] = useState(false);

  const multiple = Boolean(master?.multiple);
  const expiry = Boolean(master?.expiryApplicable);
  const period = isPeriodBased(item.documentCode);
  const resubmit = item.status === "Rejected";
  const types = master?.fileTypes ?? ["pdf", "jpg", "png"];
  const maxMb = master?.maxMb ?? 10;

  function take(list: FileList | File[]) {
    const picked = Array.from(list);
    const next = multiple ? [...files, ...picked] : picked.slice(0, 1);
    for (const file of picked) {
      if (!fileAllowed(file.name, types)) {
        setError(`${file.name}: this document accepts ${types.join(", ")}.`);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setError(`${file.name} is larger than ${maxMb} MB.`);
        return;
      }
    }
    if (!multiple && picked.length > 1) {
      setError("This document accepts a single file.");
      return;
    }
    if (item.maxFiles && next.length > item.maxFiles) {
      setError(`At most ${item.maxFiles} files are allowed.`);
      return;
    }
    setFiles(next);
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (files.length === 0) return setError("At least one file must be selected.");
    if (expiry && master?.issueDateRequired && !issueDate) return setError("Issue date is required.");
    if (expiry && master?.expiryDateRequired && !expiryDate) return setError("Expiry date is required.");
    if (issueDate && expiryDate && expiryDate <= issueDate) return setError("Expiry date must be later than the issue date.");
    if (period && (!periodFrom || !periodTo)) return setError("Statement period from and to are required.");
    if (period && periodTo < periodFrom) return setError("Statement period to must not be earlier than the period from.");
    setSending(true);
    const stored = await Promise.all(files.map(readFileForStore));
    const message = onSubmit({ files: stored, reference, issueDate, expiryDate, periodFrom, periodTo, remarks }, internal ? received : undefined);
    if (message) {
      setError(message);
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="fields" style={{ gridTemplateColumns: "1fr" }}>
      <div className="fields">
        {context.map((row) => (
          <Field key={row.label} label={row.label}>
            <input value={row.value} readOnly />
          </Field>
        ))}
      </div>
      {error && <div className="banner banner-danger">{error}</div>}
      <label
        className={over ? "dropzone is-over" : files.length ? "dropzone is-ready" : "dropzone"}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          aria-label="Select file or files"
          multiple={multiple}
          accept={types.map((type) => `.${type.replace(".", "")}`).join(",")}
          onChange={(event) => {
            if (event.target.files) take(event.target.files);
            event.target.value = "";
          }}
        />
        <strong>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : multiple ? "Drop the files here" : "Drop the file here"}</strong>
        <span>
          or browse. {types.join(", ")}. Maximum {maxMb} MB each{item.maxFiles ? `, up to ${item.maxFiles} files` : ""}.
        </span>
      </label>
      {files.length > 0 && (
        <ul className="hint" style={{ listStyle: "none", padding: 0 }}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
              <span>
                {file.name} · {sizeLabel(file.size)}
              </span>
              <button type="button" className="link" onClick={() => setFiles(files.filter((_, at) => at !== index))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="fields">
        {internal && (
          <Field label="Received through" required>
            <select value={received} onChange={(event) => setReceived(event.target.value as ReceivedThrough)}>
              <option>Email</option>
              <option>In Person</option>
              <option>Other</option>
            </select>
          </Field>
        )}
        <Field label="Document reference number">
          <input value={reference} onChange={(event) => setReference(event.target.value)} />
        </Field>
        {expiry && (
          <>
            <Field label="Issue date" required={master?.issueDateRequired}>
              <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
            </Field>
            <Field label="Expiry date" required={master?.expiryDateRequired}>
              <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
            </Field>
          </>
        )}
        {period && (
          <>
            <Field label="Statement period from" required>
              <input type="month" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
            </Field>
            <Field label="Statement period to" required>
              <input type="month" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
            </Field>
          </>
        )}
        <Field label="Remarks" className="span-2">
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </Field>
      </div>
      <div className="row-actions">
        <Button type="submit" disabled={sending}>
          {sending ? "Sending" : resubmit ? "Resubmit Document" : "Submit Document"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
