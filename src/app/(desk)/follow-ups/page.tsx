"use client";

import { useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { saveFollowUp } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { FollowUp } from "@/lib/types";

export default function FollowUpsPage() {
  const { state, replace, user } = useDesk();
  const [applicationId, setApplicationId] = useState("");
  const [contactId, setContactId] = useState("");
  const [type, setType] = useState<FollowUp["type"]>("Call");
  const [at, setAt] = useState("2026-10-26T10:00");
  const [purpose, setPurpose] = useState("Document collection");
  const [summary, setSummary] = useState("");
  const [response, setResponse] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [error, setError] = useState("");

  if (!state || !user) return null;
  const app = state.applications.find((item) => item.id === applicationId);
  const customer = state.customers.find((item) => item.id === app?.customerId);

  function save() {
    if (!applicationId || !contactId || !summary.trim()) {
      setError("Application, contact, and discussion summary are required.");
      return;
    }
    replace(
      saveFollowUp(
        state!,
        {
          applicationId,
          contactId,
          type,
          at: new Date(at).toISOString(),
          purpose,
          summary,
          response,
          nextAt: nextAt ? new Date(nextAt).toISOString() : undefined,
          ownerId: user!.id,
          status: nextAt ? "Open" : "Completed",
        },
        user!,
      ),
    );
    setSummary("");
    setResponse("");
    setError("");
  }

  return (
    <Gate module="Leads">
      <div className="page">
        <PageHeader title="Customer follow-up" lede="Calls, emails, and meetings stay with the application." />
        {error && <div className="banner banner-danger">{error}</div>}
        <div className="fields">
          <Field label="Application" required>
            <select
              value={applicationId}
              onChange={(event) => {
                setApplicationId(event.target.value);
                const nextApp = state.applications.find((item) => item.id === event.target.value);
                const nextCustomer = state.customers.find((item) => item.id === nextApp?.customerId);
                setContactId(nextCustomer?.contacts[0]?.id ?? "");
              }}
            >
              <option value="">Select</option>
              {state.applications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact person" required>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)}>
              <option value="">Select</option>
              {customer?.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" required>
            <select value={type} onChange={(event) => setType(event.target.value as FollowUp["type"])}>
              <option>Call</option>
              <option>Email</option>
              <option>Meeting</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Date and time" required>
            <input type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
          </Field>
          <Field label="Purpose" required>
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </Field>
          <Field label="Next follow-up">
            <input type="datetime-local" value={nextAt} onChange={(event) => setNextAt(event.target.value)} />
          </Field>
          <Field label="Discussion summary" required className="span-2">
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
          </Field>
          <Field label="Customer response" className="span-2">
            <textarea value={response} onChange={(event) => setResponse(event.target.value)} />
          </Field>
        </div>
        <div style={{ margin: "12px 0 24px" }}>
          <Button onClick={save}>Save follow-up</Button>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Application</th>
              <th>Type</th>
              <th>Summary</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {state.followUps.map((row) => {
              const rowApp = state.applications.find((item) => item.id === row.applicationId);
              return (
                <tr key={row.id}>
                  <td>{formatWhen(row.at)}</td>
                  <td>{rowApp?.number}</td>
                  <td>
                    {row.type}
                    <div>
                      <StatusText value={row.status} />
                    </div>
                  </td>
                  <td>
                    <strong>{row.purpose}</strong>
                    <div>{row.summary}</div>
                    {row.nextAt && <div className="hint">Next: {formatWhen(row.nextAt)}</div>}
                  </td>
                  <td>{userName(state, row.ownerId)}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
