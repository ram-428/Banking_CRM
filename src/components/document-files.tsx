"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, DataTable, StatusText } from "@/components/ui";
import { formatWhen } from "@/lib/format";
import { coverage, isPeriodBased, sizeLabel } from "@/lib/service-documents";
import type { ServiceChecklistItem, ServiceFile } from "@/lib/types";

function Preview({ file, onClose }: { file: ServiceFile; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!file.dataUrl) return;
    let objectUrl = "";
    fetch(file.dataUrl)
      .then((response) => response.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(""));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  const image = /\.(png|jpe?g|gif|webp)$/i.test(file.fileName);
  return createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" />
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label={`Preview of ${file.fileName}`}>
        <header className="modal-head">
          <h2>{file.fileName}</h2>
          <p>
            Version {file.version} · {sizeLabel(file.size)}
          </p>
          <button className="modal-x" type="button" aria-label="Close preview" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="modal-body">
          {!file.dataUrl && <p className="hint">This demo keeps only the file name and size for large or seeded files, so there is nothing to display. Files up to 700 KB can be previewed.</p>}
          {file.dataUrl && !url && <p className="hint">Loading preview.</p>}
          {url && image && <img src={url} alt={file.fileName} style={{ maxWidth: "100%", maxHeight: "70vh" }} />}
          {url && !image && <iframe src={url} title={file.fileName} style={{ width: "100%", height: "70vh", border: 0 }} />}
        </div>
        <footer className="modal-foot">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Version history and preview for one checklist item. Customers see only the status, upload details and the
 * customer-visible rejection reason. Staff also see internal review remarks and can decide each file.
 */
export function DocumentFiles({
  item,
  audience,
  nameOf,
  onDecide,
}: {
  item: ServiceChecklistItem;
  audience: "customer" | "staff";
  nameOf?: (id: string) => string;
  onDecide?: (file: ServiceFile, decision: "Approved" | "Rejected") => void;
}) {
  const [previewing, setPreviewing] = useState<ServiceFile | null>(null);
  const files = item.files ?? [];
  const staff = audience === "staff";
  const live = files.filter((file) => file.status === "Uploaded" || file.status === "Approved");
  const cover = isPeriodBased(item.documentCode) ? coverage(live) : undefined;

  if (files.length === 0) return <p className="hint">No file has been submitted for this document yet.</p>;
  return (
    <div>
      {staff && cover && (cover.duplicates.length > 0 || cover.gaps.length > 0) && (
        <p className="hint" style={{ color: "var(--color-danger, #b42318)" }}>
          {cover.duplicates.length > 0 && `Duplicate statement period: ${cover.duplicates.join("; ")}. `}
          {cover.gaps.length > 0 && `Missing months: ${cover.gaps.join(", ")}.`}
        </p>
      )}
      {cover && <p className="hint">Periods covered: {cover.months} month{cover.months === 1 ? "" : "s"}.</p>}
      <DataTable>
        <thead>
          <tr>
            <th>Version</th>
            <th>File</th>
            <th>Uploaded by</th>
            <th>Uploaded</th>
            <th>Details</th>
            <th>Status</th>
            {staff && <th>Reviewed</th>}
            <th>{staff ? "Review remarks" : "Reason"}</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.version}</td>
              <td>
                {file.fileName}
                <div className="hint">{sizeLabel(file.size)}</div>
              </td>
              <td>
                {file.uploadedByType === "Customer" ? "Customer" : staff ? nameOf?.(file.uploadedBy) ?? "Employee" : "Employee"}
                {staff && file.receivedThrough && <div className="hint">Received through {file.receivedThrough}</div>}
              </td>
              <td>{formatWhen(file.uploadedAt)}</td>
              <td className="hint">
                {file.reference && <div>Ref {file.reference}</div>}
                {file.expiryDate && <div>Expires {file.expiryDate}</div>}
                {file.periodFrom && file.periodTo && (
                  <div>
                    {file.periodFrom} to {file.periodTo}
                  </div>
                )}
              </td>
              <td>
                <StatusText value={file.status === "Uploaded" ? (staff ? "Under Review" : "Uploaded") : file.status} />
              </td>
              {staff && (
                <td className="hint">
                  {file.verifiedBy ? (
                    <>
                      {nameOf?.(file.verifiedBy) ?? file.verifiedBy}
                      <div>{file.verifiedAt ? formatWhen(file.verifiedAt) : ""}</div>
                    </>
                  ) : (
                    "Pending"
                  )}
                </td>
              )}
              <td className="hint">{[file.rejectionReason, staff ? file.reviewRemarks : undefined].filter(Boolean).join(" · ") || "None"}</td>
              <td>
                <div className="row-actions">
                  <Button type="button" variant="secondary" onClick={() => setPreviewing(file)}>
                    View
                  </Button>
                  {staff && onDecide && file.status === "Uploaded" && (
                    <>
                      <Button type="button" onClick={() => onDecide(file, "Approved")}>
                        Approve
                      </Button>
                      <Button type="button" variant="danger" onClick={() => onDecide(file, "Rejected")}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {previewing && <Preview file={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
