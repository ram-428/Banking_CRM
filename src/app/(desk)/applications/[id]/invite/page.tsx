"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApplicationFrame, useRecord } from "@/components/application-frame";
import { Button, Field, Gate, StatusText } from "@/components/ui";
import { revokeInvitation, sendInvitation } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const { customer, application } = useRecord(id);
  const router = useRouter();
  const [contactId, setContactId] = useState(customer?.contacts[0]?.id ?? "");
  const [email, setEmail] = useState(customer?.contacts[0]?.email ?? "");
  const [expiry, setExpiry] = useState("2026-11-10T18:00");
  const [template, setTemplate] = useState("Document request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!contactId && customer?.contacts[0]) {
      setContactId(customer.contacts[0].id);
      setEmail(customer.contacts[0].email);
    }
  }, [contactId, customer]);

  if (!state || !user || !customer || !application) return <ApplicationFrame id={id}> </ApplicationFrame>;
  const invites = state.invitations.filter((item) => item.applicationId === id);

  function choose(nextId: string) {
    const contact = customer!.contacts.find((item) => item.id === nextId);
    setContactId(nextId);
    setEmail(contact?.email ?? "");
  }

  function send() {
    if (!email.includes("@") || !expiry) {
      setError("Email and expiry are required.");
      return;
    }
    replace(
      sendInvitation(
        state!,
        { applicationId: id, contactId, email, expiresAt: new Date(expiry).toISOString(), template, message },
        user!,
      ),
    );
    setError("");
    setMessage("");
  }

  return (
    <Gate module="Applications" action="edit">
    <ApplicationFrame id={id} lede="The link is time-limited and opens only this application.">
      {error && <div className="banner banner-danger">{error}</div>}
      <div className="fields">
        <Field label="Contact person" required>
          <select value={contactId} onChange={(event) => choose(event.target.value)}>
            {customer.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} · {contact.type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email address" required>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Invitation expiry" required>
          <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
        </Field>
        <Field label="Email template" required>
          <select value={template} onChange={(event) => setTemplate(event.target.value)}>
            <option>Document request</option>
            <option>Resubmission</option>
            <option>Agreement ready</option>
          </select>
        </Field>
        <Field label="Additional message" className="span-2">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "16px 0 28px" }}>
        <Button onClick={send}>Send invitation</Button>
        <Button
          variant="secondary"
          onClick={() => {
            replace({ ...state, portalEmail: email.toLowerCase() });
            router.push("/portal/home");
          }}
        >
          Preview as customer
        </Button>
      </div>
      <h2 className="block-title">Invitation history</h2>
      <table className="data">
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id}>
              <td>
                {invite.email}
                <div className="hint">{invite.template}</div>
              </td>
              <td>
                <StatusText value={invite.status} />
              </td>
              <td>{formatWhen(invite.sentAt)}</td>
              <td>{formatWhen(invite.expiresAt)}</td>
              <td>
                {invite.status !== "Revoked" && invite.status !== "Expired" && (
                  <Button variant="ghost" onClick={() => replace(revokeInvitation(state, invite.id, user))}>
                    Revoke
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {invites.length === 0 && (
            <tr>
              <td colSpan={5}>No invitation has been sent.</td>
            </tr>
          )}
        </tbody>
      </table>
    </ApplicationFrame>
    </Gate>
  );
}
