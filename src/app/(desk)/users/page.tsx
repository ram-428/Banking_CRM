"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { saveUser } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { Department } from "@/lib/types";

export default function UsersPage() {
  const { state, replace, user } = useDesk();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [role, setRole] = useState("All roles");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", mobile: "", employeeCode: "", department: "Sales" as Department, role: "Sales", managerId: "" });
  const [error, setError] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.users.filter((person) => {
      const blob = `${person.name} ${person.email} ${person.employeeCode ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All statuses" && person.status !== status) return false;
      if (role !== "All roles" && person.role !== role) return false;
      return true;
    });
  }, [state, q, status, role]);

  if (!state || !user) return null;
  const roles = [...new Set([...state.roles.map((item) => item.name), ...state.users.map((person) => person.role)])];

  function closeAdd() {
    setAdding(false);
    setDraft({ name: "", email: "", mobile: "", employeeCode: "", department: "Sales", role: "Sales", managerId: "" });
    setError("");
  }

  function save() {
    if (!state || !user) return;
    if (!draft.name.trim() || !draft.email.includes("@") || !draft.mobile.trim()) {
      setError("Name, a unique email, and mobile are required.");
      return;
    }
    const result = saveUser(state, { ...draft, managerId: draft.managerId || undefined, status: "Active", password: "welcome" }, user);
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    closeAdd();
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader title="Users" lede="Employee accounts, departments, and role assignments." />
        <div className="filters">
          <input aria-label="Search users" placeholder="Search name, email, or code" value={q} onChange={(event) => setQ(event.target.value)} />
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option>All roles</option>
            {roles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {can(state, "Users", "create") && (
            <Button type="button" className="push" onClick={() => setAdding(true)}>
              + Add user
            </Button>
          )}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.id}>
                <td>
                  <Link className="link" href={`/users/${person.id}`}>
                    {person.name}
                  </Link>
                </td>
                <td>{person.employeeCode ?? "None"}</td>
                <td>
                  {person.email}
                  <div className="hint">{person.mobile}</div>
                </td>
                <td>{person.department}</td>
                <td>{person.role}</td>
                <td>{person.managerId ? userName(state, person.managerId) : "None"}</td>
                <td>
                  <StatusText value={person.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>No users match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="list-foot">
          Showing {rows.length === 0 ? "0" : `1–${rows.length}`} of {state.users.length}
        </div>
        <FormDialog
          open={adding}
          title="Add user"
          description="Add an employee. The preview password is welcome until access is reset."
          submitLabel="Create user"
          onClose={closeAdd}
          onSubmit={save}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            <Field label="Name" required>
              <input autoFocus placeholder="Enter the full name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Email" required>
              <input type="email" placeholder="Enter the email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </Field>
            <Field label="Mobile" required>
              <input placeholder="Enter the mobile number" value={draft.mobile} onChange={(event) => setDraft({ ...draft, mobile: event.target.value })} />
            </Field>
            <Field label="Employee code">
              <input placeholder="Enter the employee code" value={draft.employeeCode} onChange={(event) => setDraft({ ...draft, employeeCode: event.target.value })} />
            </Field>
            <Field label="Department" required>
              <select value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value as Department })}>
                <option>Sales</option>
                <option>Credit</option>
                <option>Operations</option>
                <option>Administration</option>
                <option>Management</option>
              </select>
            </Field>
            <Field label="Role" required>
              <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
                {state.roles.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Reporting manager" className="span-2">
              <select value={draft.managerId} onChange={(event) => setDraft({ ...draft, managerId: event.target.value })}>
                <option value="">None</option>
                {state.users.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
