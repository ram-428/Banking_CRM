"use client";

import { useState } from "react";
import { Button, DataTable, Field, StatusText } from "@/components/ui";
import { can, primaryContact } from "@/lib/access";
import { revokeInvitation, sendPortalInvitation } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import type { Invitation, State, User } from "@/lib/types";

function statusOf(invitation: Invitation) {
  if (invitation.status === "Revoked") return "Revoked";
  if (invitation.status === "Expired" || new Date(invitation.expiresAt).getTime() < Date.now()) return "Expired";
  return invitation.status === "Opened" ? "Accepted" : "Sent";
}

/** Customer portal invitation (BRD 5.8). Sent to the primary contact only; resending revokes the older link. */
export function PortalInvitationPanel({
  state,
  customerId,
  requestId,
  user,
  onChange,
  onError,
}: {
  state: State;
  customerId: string;
  requestId?: string;
  user: User;
  onChange: (next: State) => void;
  onError: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const customer = state.customers.find((item) => item.id === customerId);
  const contact = primaryContact(customer);
  const allowed = can(state, "Applications", "edit");
  const rows = state.invitations.filter((item) => item.customerId === customerId && (item.requestId ?? "") === (requestId ?? ""));
  const active = rows.some((item) => ["Sent", "Accepted"].includes(statusOf(item)));

  function send() {
    const outcome = sendPortalInvitation(state, { customerId, requestId, message }, user);
    if (outcome.error) {
      onError(outcome.error);
      return;
    }
    onError("");
    setMessage("");
    onChange(outcome.state);
  }

  return (
    <section className="panel">
      <h2>Customer portal invitation</h2>
      <div className="fields">
        <Field label="Customer">
          <input value={customer ? `${customer.name} · ${customer.code}` : ""} readOnly />
        </Field>
        <Field label="Contact person">
          <input value={contact?.name ?? ""} readOnly />
        </Field>
        <Field label="Email address" hint={contact?.email ? undefined : "Add an email on the customer contact before sending."}>
          <input value={contact?.email ?? ""} readOnly />
        </Field>
        <Field label="Additional message" className="span-2">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Optional. Added to the invitation." disabled={!allowed} />
        </Field>
      </div>
      {allowed && (
        <div className="row-actions">
          <Button type="button" onClick={send}>
            {active ? "Resend invitation" : "Send invitation"}
          </Button>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="hint">No invitation has been sent yet.</p>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Sent</th>
              <th>To</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invitation) => {
              const status = statusOf(invitation);
              return (
                <tr key={invitation.id}>
                  <td>{formatWhen(invitation.sentAt)}</td>
                  <td>{invitation.email}</td>
                  <td>{formatWhen(invitation.expiresAt)}</td>
                  <td>
                    <StatusText value={status} />
                  </td>
                  <td>
                    {allowed && (status === "Sent" || status === "Accepted") && (
                      <Button type="button" variant="secondary" onClick={() => onChange(revokeInvitation(state, invitation.id, user))}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </section>
  );
}
