"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { Button, Field } from "@/components/ui";
import { uploadDocument, uploadServiceDocument } from "@/lib/actions";
import { fileAllowed } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function UploadPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { state, replace } = useStore();
  const router = useRouter();
  const item = state?.checklist.find((row) => row.id === itemId);
  const serviceItem = (state?.serviceInstances ?? []).flatMap((instance) => instance.checklist).find((row) => row.id === itemId);
  const master = state?.documents.find((doc) => doc.code === item?.documentCode);
  const [fileName, setFileName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (state && !state.portalEmail) router.replace("/customer");
  }, [state, router]);

  if (!state || !state.portalEmail) return null;
  if (!item && serviceItem) {
    const masterForService = state.documents.find((doc) => doc.code === serviceItem.documentCode);
    return (
      <PortalShell email={state.portalEmail} back={{ href: "/customer/home", label: "Checklist" }}>
        <p className="portal-kicker">Service document</p>
        <h1 className="portal-title">{serviceItem.name}</h1>
        <p className="lede portal-lede">The file is stored and marked Uploaded. The desk still has to approve it.</p>
        {serviceItem.rejectionReason && <div className="banner banner-warn">Last rejection: {serviceItem.rejectionReason}</div>}
        {error && <div className="banner banner-danger">{error}</div>}
        <label className={over ? "dropzone is-over" : fileName ? "dropzone is-ready" : "dropzone"} onDragOver={(event) => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(event) => { event.preventDefault(); setOver(false); const file = event.dataTransfer.files?.[0]; if (file) take(file); }}>
          <input type="file" accept={masterForService?.fileTypes.map((type) => `.${type}`).join(",") || ".pdf,.jpg,.png"} onChange={(event) => { const file = event.target.files?.[0]; if (file) take(file); }} />
          <strong>{fileName || "Choose a file"}</strong>
        </label>
        <Button type="button" onClick={() => {
          if (!fileName) { setError("Choose a file."); return; }
          const result = uploadServiceDocument(state, serviceItem.id, fileName, state.portalEmail ?? "Customer");
          if (result.error) { setError(result.error); return; }
          replace(result.state);
          router.push("/customer/home");
        }}>Send file</Button>
      </PortalShell>
    );
  }
  if (!item) return null;
  const previous = state.versions.filter((version) => version.checklistItemId === item.id);
  const latest = previous[0];
  const isStatement = item.documentCode === "DOC-BS";
  const accept = master?.fileTypes.join(", ") ?? "pdf, jpg, png";

  function take(file: File) {
    if (master && file.size > master.maxMb * 1024 * 1024) {
      setError(`File is larger than ${master.maxMb} MB.`);
      setFileName("");
      return;
    }
    if (master && !fileAllowed(file.name, master.fileTypes)) {
      setError(`This document accepts ${master.fileTypes.join(", ")}.`);
      setFileName("");
      return;
    }
    setFileName(file.name);
    setError("");
  }

  function save() {
    if (sending) return;
    if (!fileName) {
      setError("Choose a file.");
      return;
    }
    if (master && !fileAllowed(fileName, master.fileTypes)) {
      setError(`This document accepts ${master.fileTypes.join(", ")}.`);
      return;
    }
    if (isStatement && (!periodFrom || !periodTo)) {
      setError("Bank statements need a from and to period.");
      return;
    }
    setSending(true);
    let value = 12;
    setProgress(value);
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 22);
      setProgress(value);
      if (value < 100) return;
      window.clearInterval(timer);
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
        setSending(false);
        setProgress(0);
        return;
      }
      replace(result.state);
      router.push("/customer/home");
    }, 140);
  }

  return (
    <PortalShell email={state.portalEmail} back={{ href: "/customer/home", label: "Checklist" }}>
      <p className="portal-kicker">Version {(previous.length || 0) + 1}</p>
      <h1 className="portal-title">{latest ? `Replace ${item.name}` : item.name}</h1>
      <p className="lede portal-lede">The new file waits for review. Sending it does not approve it.</p>
      {latest?.comments && (
        <div className="banner banner-warn">
          Last rejection: {latest.rejectionReason}. {latest.comments}
        </div>
      )}
      {error && <div className="banner banner-danger">{error}</div>}
      <label
        className={over ? "dropzone is-over" : fileName ? "dropzone is-ready" : "dropzone"}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) take(file);
        }}
      >
        <input
          type="file"
          aria-label="Choose a file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) take(file);
          }}
        />
        <strong>{fileName || "Drop the file here"}</strong>
        <span>{fileName ? "Ready to send" : `or browse. ${accept}. Maximum ${master?.maxMb ?? 10} MB.`}</span>
      </label>
      {sending && (
        <div className="portal-meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="fields portal-fields">
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
        <Field label="Remarks" className="span-2">
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </Field>
      </div>
      <Button onClick={save} disabled={sending}>
        {sending ? "Sending" : latest ? "Submit replacement" : "Submit for review"}
      </Button>
    </PortalShell>
  );
}
