"use client";

import { useEffect, useState } from "react";
import { Button, Field, PageHeader } from "@/components/ui";
import { saveUser } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function ProfilePage() {
  const { state, replace, user } = useDesk();
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) setMobile(user.mobile);
  }, [user]);

  if (!state || !user) return null;
  const events = state.audit.filter((event) => event.actorId === user.id).slice(0, 12);

  return (
    <div className="page">
      <PageHeader title="Your profile" lede="Contact details can be updated. Role and department are controlled by an administrator." />
      <dl className="facts" style={{ marginBottom: 18 }}>
        <div>
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{user.department}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user.role}</dd>
        </div>
      </dl>
      <div className="fields" style={{ maxWidth: 360 }}>
        <Field label="Mobile number">
          <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
        </Field>
      </div>
      <div style={{ margin: "12px 0 28px" }}>
        <Button
          onClick={() => {
            const result = saveUser(state, { ...user, mobile }, user);
            if (result.error) setMessage(result.error);
            else {
              replace(result.state);
              setMessage("Mobile number saved.");
            }
          }}
        >
          Save mobile
        </Button>
        {message && <span className="hint"> {message}</span>}
      </div>
      <h2 className="block-title">Your activity</h2>
      <table className="data">
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Module</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{formatWhen(event.at)}</td>
              <td>{event.action}</td>
              <td>{event.module}</td>
              <td>{event.record}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={4}>No actions recorded for you in this session yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
