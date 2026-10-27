"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { resetAccess, saveUser, setUserStatus } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { Department, User, UserRole } from "@/lib/types";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const { state, replace, user } = useDesk();
  const person = state?.users.find((item) => item.id === id);
  const [draft, setDraft] = useState<User | null>(person ?? null);
  const [message, setMessage] = useState("");

  if (!state || !user || !person) {
    return (
      <Gate module="Users">
        <div className="page">
          <PageHeader title="User not found" />
        </div>
      </Gate>
    );
  }
  const form = draft ?? person;

  function save() {
    const result = saveUser(state!, form, user!);
    if (result.error) setMessage(result.error);
    else {
      replace(result.state);
      setMessage("User saved.");
    }
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader crumbs={[{ href: "/users", label: "User list" }, { label: person.name }]} title={person.name} actions={<StatusText value={person.status} />} />
        {message && <div className="banner">{message}</div>}
        <div className="fields">
          <Field label="User ID" hint="Assigned by the system and cannot be changed.">
            <input value={person.id} readOnly />
          </Field>
          <Field label="Full name" required>
            <input value={form.name} onChange={(event) => setDraft({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Email address" required>
            <input value={form.email} onChange={(event) => setDraft({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Mobile number" required>
            <input value={form.mobile} onChange={(event) => setDraft({ ...form, mobile: event.target.value })} />
          </Field>
          <Field label="Employee code">
            <input value={form.employeeCode ?? ""} onChange={(event) => setDraft({ ...form, employeeCode: event.target.value })} />
          </Field>
          <Field label="Department" required>
            <select value={form.department} onChange={(event) => setDraft({ ...form, department: event.target.value as Department })}>
              <option>Sales</option>
              <option>Credit</option>
              <option>Operations</option>
              <option>Administration</option>
              <option>Management</option>
            </select>
          </Field>
          <Field label="Role" required>
            <select value={form.role} onChange={(event) => setDraft({ ...form, role: event.target.value as UserRole })}>
              {state.roles.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Reporting manager">
            <select value={form.managerId ?? ""} onChange={(event) => setDraft({ ...form, managerId: event.target.value || undefined })}>
              <option value="">None</option>
              {state.users
                .filter((item) => item.id !== person.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Status" required>
            <select value={form.status} onChange={(event) => setDraft({ ...form, status: event.target.value as User["status"] })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button onClick={save}>Save changes</Button>
          <Button variant="secondary" onClick={() => replace(setUserStatus(state, person.id, person.status === "Active" ? "Inactive" : "Active", user))}>
            {person.status === "Active" ? "Deactivate" : "Restore access"}
          </Button>
          <Button variant="ghost" onClick={() => replace(resetAccess(state, person.id, user))}>
            Reset access
          </Button>
        </div>
      </div>
    </Gate>
  );
}
