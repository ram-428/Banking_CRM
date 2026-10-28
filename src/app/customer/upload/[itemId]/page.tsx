"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { PortalShell, usePortalGuard } from "@/components/portal-shell";
import { submitServiceDocument } from "@/lib/actions";
import { useStore } from "@/lib/store";

export default function UploadPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { state, replace } = useStore();
  const router = useRouter();

  usePortalGuard();

  if (!state || !state.portalEmail) return null;
  const email = state.portalEmail;
  const customer = state.customers.find((row) => row.contacts.some((contact) => contact.email.toLowerCase() === email));
  const instance = state.serviceInstances.find((row) => row.checklist.some((item) => item.id === itemId));
  const item = instance?.checklist.find((row) => row.id === itemId);
  const request = state.serviceRequests.find((row) => row.id === instance?.requestId && row.customerId === customer?.id);
  const back = { href: request ? `/customer/requests/${request.id}` : "/customer/home", label: request ? request.number : "Dashboard" };

  if (!customer || !instance || !item || !request) {
    return (
      <PortalShell email={email} back={{ href: "/customer/home", label: "Dashboard" }}>
        <div className="banner">This document is not on your account.</div>
      </PortalShell>
    );
  }

  const master = state.documents.find((doc) => doc.code === item.documentCode);
  const service = state.services.find((row) => row.id === instance.serviceId);
  const blocked = item.status === "Approved" || (item.status === "Uploaded" && !master?.multiple);

  return (
    <PortalShell email={email} back={back}>
      <p className="portal-kicker">{item.status === "Rejected" ? "Resubmit document" : "Upload document"}</p>
      <h1 className="portal-title">{item.name}</h1>
      <p className="lede portal-lede">Sending a file does not approve it. The desk reviews every version, and your earlier versions are kept.</p>
      {item.rejectionReason && <div className="banner banner-warn">Rejected: {item.rejectionReason}</div>}
      {item.status === "Expired" && <div className="banner banner-warn">The approved version has expired. Upload a replacement. The old version stays in the history.</div>}
      {blocked ? (
        <div className="banner">{item.status === "Approved" ? "This document is approved and cannot be replaced." : "This document is already submitted and waiting for review."}</div>
      ) : (
        <DocumentUploadForm
          item={item}
          master={master}
          context={[
            { label: "Request number", value: request.number },
            { label: "Customer", value: `${customer.name} · ${customer.code}` },
            { label: "Service", value: service?.name ?? "Service" },
            { label: "Document", value: item.name },
          ]}
          onCancel={() => router.push(back.href)}
          onSubmit={(input) => {
            const outcome = submitServiceDocument(state, item.id, input, { type: "Customer", label: email });
            if (outcome.error) return outcome.error;
            replace(outcome.state);
            router.push(back.href);
          }}
        />
      )}
    </PortalShell>
  );
}
