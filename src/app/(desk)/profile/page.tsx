"use client";

import { useEffect, useState } from "react";
import { Button, Field, PageHeader, DataTable } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { saveUser } from "@/lib/actions";
import { auditResult, formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Department } from "@/lib/types";

export default function ProfilePage() {
  const { state, replace, user } = useDesk();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [department, setDepartment] = useState<Department>(user?.department ?? "Administration");
  const [role, setRole] = useState(user?.role ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setMobile(user.mobile);
    setDepartment(user.department);
    setRole(user.role);
  }, [user]);

  if (!state || !user) return null;
  const canEditAccount = can(state, "Users", "edit");
  const canReadLog = can(state, "Audit");
  const events = (canReadLog ? state.audit : state.audit.filter((event) => event.actorId === user.id)).slice(0, 20);

  function save() {
    if (!name.trim() || !email.includes("@") || !mobile.trim()) {
      setMessage("Name, a valid email, and mobile are required.");
      return;
    }
    const result = saveUser(
      state!,
      {
        ...user!,
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        department: canEditAccount ? department : user!.department,
        role: canEditAccount ? role : user!.role,
      },
      user!,
    );
    if (result.error) setMessage(result.error);
    else {
      replace(result.state);
      setMessage("Profile saved.");
    }
  }

  return (
    <div className="page">
      <PageHeader title="User profile" lede="Your profile and the activity you are allowed to see. The log is read-only." />
      {message && <div className="banner">{message}</div>}
      <div className="fields">
        <Field label="Full name" required>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email address" required>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Mobile number" required>
          <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
        </Field>
        <Field label="Department" hint={canEditAccount ? undefined : "An administrator controls department."}>
          <select value={department} disabled={!canEditAccount} onChange={(event) => setDepartment(event.target.value as Department)}>
            <option>Sales</option>
            <option>Credit</option>
            <option>Operations</option>
            <option>Administration</option>
            <option>Management</option>
          </select>
        </Field>
        <Field label="Role" hint={canEditAccount ? undefined : "An administrator controls role."}>
          <select value={role} disabled={!canEditAccount} onChange={(event) => setRole(event.target.value)}>
            {state.roles.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ margin: "12px 0 28px" }}>
        <Button onClick={save}>Save profile</Button>
      </div>
      <h2 className="block-title">Activity log</h2>
      <DataTable>
        <thead>
          <tr>
            <th>Actor</th>
            <th>Action</th>
            <th>Module</th>
            <th>Record</th>
            <th>Date/time</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{userName(state, event.actorId)}</td>
              <td>{event.action}</td>
              <td>{event.module}</td>
              <td>{event.record}</td>
              <td>{formatWhen(event.at)}</td>
              <td>{auditResult(event)}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={6}>No activity is available for this account yet.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
